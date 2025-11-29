<template>
  <div id="app">
    <AdminView />
  </div>
</template>

<script>
import AdminView from './views/AdminView.vue'

export default {
  name: 'App',
  components: {
    AdminView
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background-color: #f8fafc;
  color: #334155;
}

#app {
  min-height: 100vh;
}
</style>