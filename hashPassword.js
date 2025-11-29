import bcrypt from 'bcryptjs';

const password = 'HM/a7GmOqd;6mZ';
const saltRounds = 12;

async function hashPassword() {
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Оригинальный пароль:', password);
    console.log('Хешированный пароль:', hash);
    
    // Проверка хеша
    const isValid = await bcrypt.compare(password, hash);
    console.log('Пароль проверен:', isValid);
    
    // SQL запрос для вставки в базу
    console.log('\nSQL запрос для вставки в базу:');
    console.log(`INSERT INTO adminka (username, password_hash) VALUES ('admin', '${hash}');`);
    
  } catch (error) {
    console.error('Ошибка:', error);
  }
}

hashPassword();