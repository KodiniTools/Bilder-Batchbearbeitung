import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'

const isElectron = !!(window as Window & { electronAPI?: { isElectron?: boolean } }).electronAPI
  ?.isElectron

const webRoutes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/LandingPage.vue')
  },
  {
    path: '/app',
    name: 'app',
    component: () => import('@/views/AppPage.vue')
  },
  {
    path: '/faq',
    name: 'faq',
    component: () => import('@/views/FaqPage.vue')
  },
  {
    path: '/blog',
    name: 'blog',
    component: () => import('@/views/BlogPage.vue')
  },
  {
    path: '/learn',
    name: 'learn',
    component: () => import('@/views/LearnPage.vue')
  },
  {
    path: '/downloads',
    name: 'downloads',
    component: () => import('@/views/DownloadsPage.vue')
  }
]

const electronRoutes = [
  {
    path: '/',
    name: 'app',
    component: () => import('@/views/AppPage.vue')
  }
]

const router = createRouter({
  history: isElectron ? createWebHashHistory() : createWebHistory(import.meta.env.BASE_URL),
  routes: isElectron ? electronRoutes : webRoutes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  }
})

export default router
