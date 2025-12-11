"""
SVG Conversion API for Bilder-Batchbearbeitung
Converts raster images (PNG, JPG, WebP) to SVG using vtracer
"""

import os
import io
import uuid
import asyncio
import zipfile
import tempfile
import shutil
from pathlib import Path
from typing import Optional
from concurrent.futures import ProcessPoolExecutor

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import vtracer
from PIL import Image

app = FastAPI(
    title="SVG Converter API",
    description="Convert raster images to SVG using vtracer",
    version="1.0.0"
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Process pool for parallel conversions (uses all CPU cores)
executor = ProcessPoolExecutor(max_workers=os.cpu_count() or 4)

# Temporary files directory
TEMP_DIR = Path(tempfile.gettempdir()) / "svg_converter"
TEMP_DIR.mkdir(exist_ok=True)

# Maximum file size (20MB)
MAX_FILE_SIZE = 20 * 1024 * 1024

# Supported input formats
SUPPORTED_FORMATS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}


def convert_image_to_svg(
    image_bytes: bytes,
    colormode: str = "color",
    filter_speckle: int = 4,
    color_precision: int = 6,
    layer_difference: int = 16,
    corner_threshold: int = 60,
    length_threshold: float = 4.0,
    max_iterations: int = 10,
    splice_threshold: int = 45,
    path_precision: int = 3
) -> str:
    """
    Convert image bytes to SVG string using vtracer.
    This function runs in a separate process for parallel execution.
    """
    # Create temporary files for input/output
    temp_id = str(uuid.uuid4())
    input_path = TEMP_DIR / f"{temp_id}_input.png"
    output_path = TEMP_DIR / f"{temp_id}_output.svg"

    try:
        # Convert to PNG if needed (vtracer works best with PNG)
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode in ('RGBA', 'LA'):
            # Handle transparency - composite on white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[3])
            else:
                background.paste(img, mask=img.split()[1])
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        img.save(str(input_path), 'PNG')

        # Convert to SVG using vtracer
        vtracer.convert_image_to_svg_py(
            str(input_path),
            str(output_path),
            colormode=colormode,
            filter_speckle=filter_speckle,
            color_precision=color_precision,
            layer_difference=layer_difference,
            corner_threshold=corner_threshold,
            length_threshold=length_threshold,
            max_iterations=max_iterations,
            splice_threshold=splice_threshold,
            path_precision=path_precision
        )

        # Read and return SVG content
        with open(output_path, 'r', encoding='utf-8') as f:
            svg_content = f.read()

        return svg_content

    finally:
        # Cleanup temporary files
        if input_path.exists():
            input_path.unlink()
        if output_path.exists():
            output_path.unlink()


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "service": "svg-converter"}


@app.post("/api/convert-svg")
async def convert_single_image(
    file: UploadFile = File(...),
    colormode: str = Form(default="color"),
    filter_speckle: int = Form(default=4),
    color_precision: int = Form(default=6),
    layer_difference: int = Form(default=16),
    corner_threshold: int = Form(default=60),
    length_threshold: float = Form(default=4.0),
    max_iterations: int = Form(default=10),
    splice_threshold: int = Form(default=45),
    path_precision: int = Form(default=3)
):
    """
    Convert a single image to SVG.

    Parameters:
    - colormode: "color" or "binary" (black & white)
    - filter_speckle: Filter out small artifacts (1-128, default 4)
    - color_precision: Color quantization precision (1-8, default 6)
    - layer_difference: Color difference threshold for layers (0-128, default 16)
    - corner_threshold: Corner detection threshold (0-180, default 60)
    - length_threshold: Minimum curve length (1-10, default 4.0)
    - max_iterations: Max fitting iterations (1-20, default 10)
    - splice_threshold: Splice angle threshold (0-180, default 45)
    - path_precision: SVG path coordinate precision (1-8, default 3)
    """
    # Validate file extension
    file_ext = Path(file.filename or "").suffix.lower()
    if file_ext not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format. Supported: {', '.join(SUPPORTED_FORMATS)}"
        )

    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")

    try:
        # Run conversion in process pool
        loop = asyncio.get_event_loop()
        svg_content = await loop.run_in_executor(
            executor,
            convert_image_to_svg,
            content,
            colormode,
            filter_speckle,
            color_precision,
            layer_difference,
            corner_threshold,
            length_threshold,
            max_iterations,
            splice_threshold,
            path_precision
        )

        # Generate output filename
        original_name = Path(file.filename or "image").stem

        return Response(
            content=svg_content,
            media_type="image/svg+xml",
            headers={
                "Content-Disposition": f'attachment; filename="{original_name}.svg"'
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")


@app.post("/api/convert-svg-batch")
async def convert_batch_images(
    files: list[UploadFile] = File(...),
    colormode: str = Form(default="color"),
    filter_speckle: int = Form(default=4),
    color_precision: int = Form(default=6),
    layer_difference: int = Form(default=16),
    corner_threshold: int = Form(default=60),
    length_threshold: float = Form(default=4.0),
    max_iterations: int = Form(default=10),
    splice_threshold: int = Form(default=45),
    path_precision: int = Form(default=3)
):
    """
    Convert multiple images to SVG and return as ZIP file.
    Processes images in parallel using all available CPU cores.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    if len(files) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 files per batch")

    # Validate and read all files
    file_data = []
    for file in files:
        file_ext = Path(file.filename or "").suffix.lower()
        if file_ext not in SUPPORTED_FORMATS:
            continue  # Skip unsupported files

        content = await file.read()
        if len(content) <= MAX_FILE_SIZE:
            file_data.append({
                "name": Path(file.filename or "image").stem,
                "content": content
            })

    if not file_data:
        raise HTTPException(status_code=400, detail="No valid image files found")

    # Convert all images in parallel
    loop = asyncio.get_event_loop()

    async def convert_one(data):
        try:
            svg = await loop.run_in_executor(
                executor,
                convert_image_to_svg,
                data["content"],
                colormode,
                filter_speckle,
                color_precision,
                layer_difference,
                corner_threshold,
                length_threshold,
                max_iterations,
                splice_threshold,
                path_precision
            )
            return {"name": data["name"], "svg": svg, "error": None}
        except Exception as e:
            return {"name": data["name"], "svg": None, "error": str(e)}

    # Run all conversions in parallel
    results = await asyncio.gather(*[convert_one(data) for data in file_data])

    # Create ZIP file with results
    zip_buffer = io.BytesIO()
    successful = 0

    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for result in results:
            if result["svg"]:
                zip_file.writestr(f"{result['name']}.svg", result["svg"])
                successful += 1

    if successful == 0:
        raise HTTPException(status_code=500, detail="All conversions failed")

    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="svg_converted.zip"',
            "X-Successful-Count": str(successful),
            "X-Total-Count": str(len(file_data))
        }
    )


@app.on_event("shutdown")
def shutdown_event():
    """Cleanup on shutdown"""
    executor.shutdown(wait=False)
    # Clean temp directory
    if TEMP_DIR.exists():
        shutil.rmtree(TEMP_DIR, ignore_errors=True)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=9003)
