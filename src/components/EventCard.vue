<!-- src/components/EventCard.vue -->
<template>
  <div class="event-card">
    <div class="event-header">
      <img v-if="event.image_path" :src="event.image_path" :alt="event.name" class="event-image" />
      <div v-else class="no-image">Нет изображения</div>
      <div class="event-actions">
        <button @click="toggleEdit" class="btn-icon" :class="{ 'editing': isEditing }">
          ✏️
        </button>
        <button @click="confirmDelete" class="btn-icon delete">
          🗑️
        </button>
      </div>
    </div>

    <div class="event-content">
      <template v-if="!isEditing">
        <h3 class="event-title">{{ event.name }}</h3>
        <p class="event-description">{{ event.description }}</p>
        <div class="event-details">
          <div class="detail-item">
            📅
            <span>{{ formatDateTime(event.date_time_event) }}</span>
          </div>
          <div class="detail-item">
            📍
            <span>{{ event.address }}</span>
          </div>
          <div class="detail-item">
            👤
            <span>{{ event.organizer }}</span>
          </div>
          <div class="detail-item">
            💰
            <span>{{ event.price ? `₽${event.price}` : 'Бесплатно' }}</span>
          </div>
        </div>
      </template>

      <template v-else>
        <input v-model="editedEvent.name" class="input-field" placeholder="Название мероприятия" />
        <textarea v-model="editedEvent.description" class="input-field textarea" placeholder="Описание мероприятия" />
        
        <!-- Загрузка изображения при редактировании -->
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
              <span v-if="!imagePreview && !editedEvent.image_path" class="file-upload-text">
                📁 Выберите новое изображение мероприятия
              </span>
              <div v-else class="image-preview">
                <img :src="imagePreview || editedEvent.image_path" alt="Preview" class="preview-image" />
                <button type="button" @click="removeImage" class="remove-image-btn">×</button>
              </div>
            </div>
          </label>
          <div v-if="uploadingImage" class="upload-progress">
            Конвертация изображения...
          </div>
        </div>

        <input v-model="editedEvent.date_time_event" type="datetime-local" class="input-field" />
        <input v-model="editedEvent.address" class="input-field" placeholder="Адрес" />
        <input v-model="editedEvent.organizer" class="input-field" placeholder="Организатор" />
        <input v-model="editedEvent.price" type="number" class="input-field" placeholder="Цена" />
        
        <div class="edit-actions">
          <button @click="saveChanges" class="btn-primary" :disabled="saving || uploadingImage">
            {{ saving ? 'Сохранение...' : 'Сохранить' }}
          </button>
          <button @click="cancelEdit" class="btn-secondary">Отмена</button>
        </div>
      </template>
    </div>

    <!-- Модальное окно подтверждения удаления -->
    <div v-if="showDeleteConfirm" class="modal-overlay">
      <div class="modal">
        <h3>Подтверждение удаления</h3>
        <p>Вы уверены, что хотите удалить мероприятие "{{ event.name }}"?</p>
        <div class="modal-actions">
          <button @click="deleteEvent" class="btn-danger" :disabled="deleting">
            {{ deleting ? 'Удаление...' : 'Да, удалить' }}
          </button>
          <button @click="cancelDelete" class="btn-secondary">Отмена</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { supabase } from '../supabase'

export default {
  name: 'EventCard',
  props: {
    event: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      isEditing: false,
      showDeleteConfirm: false,
      saving: false,
      deleting: false,
      uploadingImage: false,
      editedEvent: { ...this.event },
      imageFile: null,
      imagePreview: null
    }
  },
  methods: {
    toggleEdit() {
      this.isEditing = !this.isEditing
      if (this.isEditing) {
        this.editedEvent = { ...this.event }
        this.imageFile = null
        this.imagePreview = null
      }
    },
    
    confirmDelete() {
      this.showDeleteConfirm = true
    },
    
    cancelDelete() {
      this.showDeleteConfirm = false
    },
    
    async deleteEvent() {
      this.deleting = true
      try {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', this.event.id)
        
        if (error) throw error
        
        this.$emit('event-deleted', this.event.id)
        this.showDeleteConfirm = false
      } catch (error) {
        console.error('Error deleting event:', error)
        alert('Ошибка при удалении мероприятия: ' + error.message)
      } finally {
        this.deleting = false
      }
    },
    
    handleImageUpload(event) {
      const file = event.target.files[0]
      if (file) {
        if (!file.type.startsWith('image/')) {
          alert('Пожалуйста, выберите файл изображения')
          return
        }

        if (file.size > 2 * 1024 * 1024) {
          alert('Размер файла не должен превышать 2MB для хранения в базе')
          return
        }

        this.imageFile = file
        
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
      this.editedEvent.image_path = ''
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = ''
      }
    },

    async convertImageToBase64(file) {
      return new Promise((resolve, reject) => {
        this.uploadingImage = true
        
        const reader = new FileReader()
        reader.onload = (e) => {
          this.uploadingImage = false
          resolve(e.target.result)
        }
        reader.onerror = (error) => {
          this.uploadingImage = false
          reject(error)
        }
        reader.readAsDataURL(file)
      })
    },
    
    async saveChanges() {
      this.saving = true
      try {
        let imageBase64 = this.editedEvent.image_path

        if (this.imageFile) {
          imageBase64 = await this.convertImageToBase64(this.imageFile)
        }

        const updateData = {
          name: this.editedEvent.name,
          description: this.editedEvent.description,
          image_path: imageBase64,
          date_time_event: this.editedEvent.date_time_event,
          address: this.editedEvent.address,
          organizer: this.editedEvent.organizer,
          price: this.editedEvent.price ? Number(this.editedEvent.price) : null
        }

        const { data, error } = await supabase
          .from('events')
          .update(updateData)
          .eq('id', this.event.id)
          .select()

        if (error) throw error

        this.$emit('event-updated', data[0])
        this.isEditing = false
        this.imageFile = null
        this.imagePreview = null
      } catch (error) {
        console.error('Error updating event:', error)
        alert('Ошибка при обновлении мероприятия: ' + error.message)
      } finally {
        this.saving = false
      }
    },
    
    cancelEdit() {
      this.isEditing = false
      this.editedEvent = { ...this.event }
      this.imageFile = null
      this.imagePreview = null
    },
    
    formatDateTime(dateTime) {
      return new Date(dateTime).toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }
}
</script>

<style scoped>
/* Стили остаются такими же как в предыдущей версии */
.event-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
  width: 100%;
}

.event-card:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px);
}

.event-header {
  position: relative;
  height: 240px;
  overflow: hidden;
}

.event-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #f1f5f9;
}

.no-image {
  width: 100%;
  height: 100%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 1.1rem;
}

.event-actions {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 12px;
}

.btn-icon {
  background: white;
  border: none;
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 18px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #f1f5f9;
  transform: scale(1.1);
}

.btn-icon.delete:hover {
  background: #fef2f2;
  color: #dc2626;
}

.btn-icon.editing {
  background: #3b82f6;
  color: white;
}

.event-content {
  padding: 32px;
}

.event-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
  line-height: 1.3;
}

.event-description {
  color: #64748b;
  margin-bottom: 24px;
  line-height: 1.6;
  font-size: 1.1rem;
}

.event-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 1rem;
  padding: 8px 0;
}

.input-field {
  width: 100%;
  padding: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 16px;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.textarea {
  min-height: 120px;
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}

.file-upload-section {
  margin-bottom: 16px;
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
  padding: 20px;
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
  font-size: 0.9rem;
}

.image-preview {
  position: relative;
  display: inline-block;
  max-width: 200px;
}

.preview-image {
  max-width: 100%;
  max-height: 150px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.remove-image-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 14px;
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

.edit-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
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
  padding: 14px 28px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: background-color 0.2s ease;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn-danger {
  background: #dc2626;
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: background-color 0.2s ease;
}

.btn-danger:hover:not(:disabled) {
  background: #b91c1c;
}

.btn-danger:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 32px;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.2);
}

.modal h3 {
  margin-bottom: 16px;
  color: #1e293b;
  font-size: 1.5rem;
  font-weight: 600;
}

.modal p {
  margin-bottom: 24px;
  color: #64748b;
  font-size: 1.1rem;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
</style>