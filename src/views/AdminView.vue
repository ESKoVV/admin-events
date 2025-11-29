<!-- src/views/AdminView.vue -->
<template>
  <div class="admin-container">
    <!-- Форма входа -->
    <div v-if="!isAuthenticated" class="login-container">
      <div class="login-card">
        <h1 class="login-title">Вход в админ-панель</h1>
        <form @submit.prevent="login" class="login-form">
          <input 
            v-model="loginData.username" 
            type="text" 
            placeholder="Логин" 
            class="input-field"
            required
          />
          <input 
            v-model="loginData.password" 
            type="password" 
            placeholder="Пароль" 
            class="input-field"
            required
          />
          <button type="submit" class="btn-primary login-btn" :disabled="loading">
            {{ loading ? 'Вход...' : 'Войти' }}
          </button>
        </form>
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
    </div>

    <!-- Админ-панель -->
    <div v-else class="admin-panel">
      <!-- Хедер -->
      <header class="admin-header">
        <h1>Управление мероприятиями</h1>
        <button @click="logout" class="btn-secondary">
          Выйти
        </button>
      </header>

      <!-- Форма добавления мероприятия -->
      <div class="add-event-section">
        <h2>Добавить новое мероприятие</h2>
        <form @submit.prevent="addEvent" class="event-form">
          <div class="form-grid">
            <input v-model="newEvent.name" placeholder="Название мероприятия" class="input-field" required />
            <textarea v-model="newEvent.description" placeholder="Описание мероприятия" class="input-field textarea" required></textarea>
            
            <!-- Загрузка изображения -->
            <div class="file-upload-section">
              <label class="file-upload-label">
                <input 
                  type="file" 
                  @change="handleImageUpload" 
                  accept="image/*" 
                  class="file-input"
                  ref="fileInput"
                />
                <div class="file-upload-area">
                  <span v-if="!imagePreview" class="file-upload-text">
                    📁 Выберите изображение мероприятия
                  </span>
                  <div v-else class="image-preview">
                    <img :src="imagePreview" alt="Preview" class="preview-image" />
                    <button type="button" @click="removeImage" class="remove-image-btn">×</button>
                  </div>
                </div>
              </label>
              <div v-if="uploadingImage" class="upload-progress">
                Конвертация изображения...
              </div>
            </div>

            <input v-model="newEvent.date_time_event" type="datetime-local" class="input-field" required />
            <input v-model="newEvent.address" placeholder="Адрес" class="input-field" required />
            <input v-model="newEvent.organizer" placeholder="Организатор" class="input-field" required />
            <input v-model="newEvent.price" type="number" placeholder="Цена" class="input-field" />
          </div>
          <button type="submit" class="btn-primary add-btn" :disabled="addingEvent || uploadingImage">
            {{ addingEvent ? 'Добавление...' : 'Добавить мероприятие' }}
          </button>
        </form>
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>

      <!-- Список мероприятий -->
      <div class="events-section">
        <h2>Существующие мероприятия</h2>
        <div v-if="loadingEvents" class="loading">
          Загрузка мероприятий...
        </div>
        <div v-else-if="events.length === 0" class="empty-state">
          Мероприятий пока нет
        </div>
        <div v-else class="events-column">
          <EventCard 
            v-for="event in sortedEvents" 
            :key="event.id" 
            :event="event"
            @event-deleted="handleEventDeleted"
            @event-updated="handleEventUpdated"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { supabase } from '../supabase'
import EventCard from '../components/EventCard.vue'

export default {
  name: 'AdminView',
  components: {
    EventCard
  },
  data() {
    return {
      isAuthenticated: false,
      loading: false,
      addingEvent: false,
      loadingEvents: false,
      uploadingImage: false,
      error: '',
      loginData: {
        username: '',
        password: ''
      },
      newEvent: {
        name: '',
        description: '',
        image_path: '',
        date_time_event: '',
        address: '',
        organizer: '',
        price: null
      },
      events: [],
      imageFile: null,
      imagePreview: null
    }
  },
  computed: {
    sortedEvents() {
      return [...this.events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }
  },
  async mounted() {
    await this.checkAuth()
  },
  methods: {
    async checkAuth() {
      const session = localStorage.getItem('admin_authenticated')
      if (session) {
        this.isAuthenticated = true
        await this.loadEvents()
      }
    },

    async login() {
      this.loading = true
      this.error = ''

      try {
        if (this.loginData.username === 'admin' && this.loginData.password === 'HM/a7GmOqd;6mZ') {
          this.isAuthenticated = true
          localStorage.setItem('admin_authenticated', 'true')
          await this.loadEvents()
        } else {
          throw new Error('Неверный логин или пароль')
        }
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    logout() {
      this.isAuthenticated = false
      this.loginData = { username: '', password: '' }
      this.events = []
      this.resetImage()
      localStorage.removeItem('admin_authenticated')
    },

    async loadEvents() {
      this.loadingEvents = true
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        this.events = data || []
      } catch (error) {
        console.error('Error loading events:', error)
        this.error = 'Ошибка при загрузке мероприятий: ' + error.message
      } finally {
        this.loadingEvents = false
      }
    },

    handleImageUpload(event) {
      const file = event.target.files[0]
      if (file) {
        // Проверка типа файла
        if (!file.type.startsWith('image/')) {
          this.error = 'Пожалуйста, выберите файл изображения'
          return
        }

        // Проверка размера файла (максимум 2MB для base64)
        if (file.size > 2 * 1024 * 1024) {
          this.error = 'Размер файла не должен превышать 2MB для хранения в базе'
          return
        }

        this.imageFile = file
        
        // Создание preview
        const reader = new FileReader()
        reader.onload = (e) => {
          this.imagePreview = e.target.result
        }
        reader.readAsDataURL(file)
      }
    },

    removeImage() {
      this.imageFile = null
      this.imagePreview = null
      this.newEvent.image_path = ''
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = ''
      }
    },

    resetImage() {
      this.imageFile = null
      this.imagePreview = null
    },

    async convertImageToBase64(file) {
      return new Promise((resolve, reject) => {
        this.uploadingImage = true
        
        const reader = new FileReader()
        reader.onload = (e) => {
          this.uploadingImage = false
          resolve(e.target.result) // data:image/png;base64,iVBORw0KGgoAAAAN...
        }
        reader.onerror = (error) => {
          this.uploadingImage = false
          reject(error)
        }
        reader.readAsDataURL(file)
      })
    },

    async addEvent() {
      this.addingEvent = true
      this.error = ''

      try {
        // Проверяем обязательные поля
        if (!this.newEvent.name || !this.newEvent.description || 
            !this.newEvent.date_time_event || !this.newEvent.address || !this.newEvent.organizer) {
          throw new Error('Пожалуйста, заполните все обязательные поля')
        }

        let imageBase64 = this.newEvent.image_path

        // Если есть выбранный файл, конвертируем в base64
        if (this.imageFile) {
          imageBase64 = await this.convertImageToBase64(this.imageFile)
        }

        const eventData = {
          name: this.newEvent.name,
          description: this.newEvent.description,
          image_path: imageBase64, // Сохраняем как base64 строку
          date_time_event: this.newEvent.date_time_event,
          address: this.newEvent.address,
          organizer: this.newEvent.organizer,
          price: this.newEvent.price ? Number(this.newEvent.price) : null
        }

        console.log('Отправляемые данные:', {
          ...eventData,
          image_path: eventData.image_path ? `base64 (${eventData.image_path.length} chars)` : 'empty'
        })

        const { data, error } = await supabase
          .from('events')
          .insert([eventData])
          .select()

        if (error) {
          console.error('Supabase error:', error)
          throw error
        }

        console.log('Данные добавлены:', data)

        if (data && data.length > 0) {
          this.events.unshift(data[0])
        }

        this.resetNewEventForm()
        this.resetImage()
        
      } catch (error) {
        console.error('Error adding event:', error)
        this.error = 'Ошибка при добавлении мероприятия: ' + error.message
      } finally {
        this.addingEvent = false
      }
    },

    handleEventDeleted(eventId) {
      this.events = this.events.filter(event => event.id !== eventId)
    },

    handleEventUpdated(updatedEvent) {
      const index = this.events.findIndex(event => event.id === updatedEvent.id)
      if (index !== -1) {
        this.events.splice(index, 1, updatedEvent)
      }
    },

    resetNewEventForm() {
      this.newEvent = {
        name: '',
        description: '',
        image_path: '',
        date_time_event: '',
        address: '',
        organizer: '',
        price: null
      }
    }
  }
}
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
}

.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-title {
  text-align: center;
  margin-bottom: 32px;
  color: #1e293b;
  font-size: 1.5rem;
  font-weight: 600;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-btn {
  margin-top: 8px;
}

.error-message {
  margin-top: 16px;
  padding: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  text-align: center;
  font-size: 0.875rem;
}

.admin-panel {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.admin-header h1 {
  color: #1e293b;
  font-size: 1.875rem;
  font-weight: 600;
}

.add-event-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 32px;
  border: 1px solid #e2e8f0;
}

.add-event-section h2 {
  margin-bottom: 20px;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
}

.event-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-grid .input-field:nth-child(1),
.form-grid .input-field:nth-child(2),
.form-grid .input-field:nth-child(3) {
  grid-column: 1 / -1;
}

.file-upload-section {
  grid-column: 1 / -1;
}

.file-input {
  display: none;
}

.file-upload-label {
  display: block;
  cursor: pointer;
}

.file-upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  transition: all 0.3s ease;
  background: #fafafa;
}

.file-upload-area:hover {
  border-color: #3b82f6;
  background: #f0f7ff;
}

.file-upload-text {
  color: #64748b;
  font-size: 1rem;
}

.image-preview {
  position: relative;
  display: inline-block;
  max-width: 300px;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.remove-image-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-image-btn:hover {
  background: #b91c1c;
}

.upload-progress {
  margin-top: 8px;
  padding: 8px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 4px;
  color: #0369a1;
  text-align: center;
  font-size: 0.875rem;
}

.add-btn {
  align-self: flex-start;
}

.events-section h2 {
  margin-bottom: 20px;
  color: #1e293b;
  font-size: 1.25rem;
  font-weight: 600;
}

.loading, .empty-state {
  text-align: center;
  padding: 60px;
  color: #64748b;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  font-size: 1.125rem;
}

.events-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.input-field {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.textarea {
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f1f5f9;
  color: #64748b;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .events-column {
    grid-template-columns: 1fr;
  }
  
  .admin-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .login-card {
    padding: 24px;
  }
  
  .file-upload-area {
    padding: 20px;
  }
}
</style>