<template>
  <router-view v-slot="{ Component }">
    <transition name="page" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup lang="ts">
// App root - no logic needed here
</script>

<style lang="scss">
@use '@/styles/global.scss';
</style>
