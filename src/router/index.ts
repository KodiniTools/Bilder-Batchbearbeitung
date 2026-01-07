import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  }
})

export default router
