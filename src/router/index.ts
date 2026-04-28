import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/index/index.vue'),
    },
    {
      path: '/work/:id',
      name: 'work-detail',
      component: () => import('@/pages/work-detail/index.vue'),
    },
    {
      path: '/map/:workId',
      name: 'map',
      component: () => import('@/pages/map/index.vue'),
    },
    {
      path: '/location/:id',
      name: 'location-detail',
      component: () => import('@/pages/location-detail/index.vue'),
    },
    {
      path: '/explore',
      name: 'explore',
      component: () => import('@/pages/explore/index.vue'),
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
