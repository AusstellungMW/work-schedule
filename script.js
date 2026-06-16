// Глобальные переменные
let calendar;
let workers = [];
const COMMON_CALENDAR_EMAIL = "Museum@Wolfenbuettel.de"; // ✅ С заглавной M!
const GITHUB_USERNAME = "AusstellungMW";
const REPO_NAME = "work-schedule";

// Инициализация календаря
function initCalendar() {
  const events = workers.map(worker => ({
    title: `${worker.name} (${worker.status})`,
    start: worker.date,
    color: getStatusColor(worker.status)
  }));

  if (calendar) calendar.destroy();

  calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
    initialView: 'dayGridMonth',
    locale: 'ru',
    events: events,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek,dayGridDay'
    }
  });
  calendar.render();
}

// Цвета для статусов
function getStatusColor(status) {
  const colors = {
    "Работает": "#28a745",
    "Болен": "#dc3545",
    "Отпуск": "#ffc107"
  };
  return colors[status] || "#6c757d";
}

// Обновляем таблицу записей
function updateWorkersList() {
  const tbody = document.getElementById('workersList');
  tbody.innerHTML = '';

  workers.forEach((worker, index) => {
    const row = document.createElement('tr');
    const statusClass = worker.status === "Работает" ? "badge-work" :
                        worker.status === "Болен" ? "badge-sick" : "badge-vacation";
    row.innerHTML = `
      <td>${worker.name}</td>
      <td>${worker.date}</td>
      <td><span class="badge ${statusClass}">${worker.status}</span></td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="openInOutlook(${index})">
          📅 В Outlook
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteWorker(${index})">
          🗑 Удалить
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Добавляем нового работника
function addWorker() {
  const name = document.getElementById('workerName').value.trim();
  const date = document.getElementById('workerDate').value;
  const status = document.getElementById('workerStatus').value;

  if (!name || !date) {
    alert('Пожалуйста, заполните имя и дату!');
    return;
  }

  workers.push({ name, date, status });
  initCalendar();
  updateWorkersList();

  document.getElementById('workerName').value = '';
  document.getElementById('workerDate').value = '';
}

// Удаляем работника
function deleteWorker(index) {
  if (confirm('Удалить эту запись?')) {
    workers.splice(index, 1);
    initCalendar();
    updateWorkersList();
  }
}

// Открываем событие в Outlook (для твоего Exchange Server)
function openInOutlook(index) {
  const worker = workers[index];
  const subject = encodeURIComponent(`${worker.name} - ${worker.status}`);
  const start = `${worker.date}T09:00:00`;
  const end = `${worker.date}T17:00:00`;
  const body = encodeURIComponent(`Сотрудник: ${worker.name}\nСтатус: ${worker.status}`);

  // ✅ ПРАВИЛЬНЫЙ URL для твоего Exchange Server
  const url = `https://mail.wolfenbuettel.de/owa/Museum@Wolfenbuettel.de/?cmd=new&module=calendar&path=/calendar/view/WorkWeek&subject=${subject}&startdt=${start}&enddt=${end}&body=${body}`;
  window.open(url, '_blank');
}

// Сохраняем токен в localStorage
function saveToken() {
  const token = document.getElementById('githubToken').value;
  if (token) {
    localStorage.setItem('githubToken', token);
    const modal = bootstrap.Modal.getInstance(document.getElementById('tokenModal'));
    modal.hide();
    alert('Токен сохранён! Теперь можно сохранять данные в GitHub.');
  } else {
    alert('Введи токен!');
  }
}

// Сохраняем данные в GitHub
async function saveToGitHub() {
  const token = localStorage.getItem('githubToken');
  if (!token) {
    const modal = new bootstrap.Modal(document.getElementById('tokenModal'));
    modal.show();
    return;
  }

  try {
    const fileResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/schedule.json`, {
      headers: {
        'Authorization': `token ${token}`
      }
    });

    let sha = '';
    if (fileResponse.ok) {
      const fileData = await fileResponse.json();
      sha = fileData.sha;
    }

    const content = btoa(JSON.stringify(workers, null, 2));

    const saveResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/schedule.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Обновление расписания работников',
        content: content,
        sha: sha
      })
    });

    if (saveResponse.ok) {
      alert('✅ Данные сохранены в GitHub!');
    } else {
      const error = await saveResponse.json();
      alert(`Ошибка: ${error.message}`);
    }
  } catch (error) {
    alert(`Ошибка: ${error.message}`);
  }
}

// Загружаем данные из schedule.json
async function loadData() {
  try {
    const response = await fetch('schedule.json');
    if (response.ok) {
      workers = await response.json();
      initCalendar();
      updateWorkersList();
    }
  } catch (error) {
    console.log("Файл schedule.json не найден, будет создан новый.");
    workers = [];
  }
}

// Загружаем данные при загрузке страницы
window.onload = function() {
  loadData();
};
