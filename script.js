// Глобальные переменные
let calendar;
let workers = [];
const COMMON_CALENDAR_EMAIL = "Museum@Wolfenbuettel.de";
const GITHUB_USERNAME = "AusstellungMW";
const REPO_NAME = "work-schedule";
const EWS_ENDPOINT = "https://mail.wolfenbuettel.de/EWS/Exchange.asmx"; // ✅ EWS endpoint твоего сервера

// Проверяем, авторизован ли пользователь
function isAuthenticated() {
  return sessionStorage.getItem('outlookUsername') && sessionStorage.getItem('outlookPassword');
}

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
    locale: 'de',
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
    "Arbeitet": "#28a745",
    "Krank": "#dc3545",
    "Urlaub": "#ffc107"
  };
  return colors[status] || "#6c757d";
}

// Обновляем таблицу записей
function updateWorkersList() {
  const tbody = document.getElementById('workersList');
  tbody.innerHTML = '';

  workers.forEach((worker, index) => {
    const row = document.createElement('tr');
    const statusClass = worker.status === "Arbeitet" ? "badge-work" :
                        worker.status === "Krank" ? "badge-sick" : "badge-vacation";
    row.innerHTML = `
      <td>${worker.name}</td>
      <td>${worker.date}</td>
      <td><span class="badge ${statusClass}">${worker.status}</span></td>
      <td>
        <button class="btn btn-sm btn-outline-primary" onclick="createEventInOutlook(${index})">
          <i class="fas fa-calendar-plus me-1"></i> Zu Kalender hinzufügen
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteWorker(${index})">
          <i class="fas fa-trash me-1"></i> Löschen
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
    alert('Bitte füllen Sie Name und Datum aus!');
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
  if (confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
    workers.splice(index, 1);
    initCalendar();
    updateWorkersList();
  }
}

// Создаём событие в Outlook через EWS (прямо, без открытия браузера)
async function createEventInOutlook(index) {
  if (!isAuthenticated()) {
    showAuthModal();
    return;
  }

  const worker = workers[index];
  const username = sessionStorage.getItem('outlookUsername');
  const password = sessionStorage.getItem('outlookPassword');

  try {
    // Формируем SOAP-запрос для создания события
    const soapRequest = `
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
                     xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
                     xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages">
        <soap:Header>
          <t:RequestServerVersion Version="Exchange2013" />
        </soap:Header>
        <soap:Body>
          <m:CreateItem SendMeetingInvitations="SendToNone">
            <m:Items>
              <t:CalendarItem>
                <t:Subject>${worker.name} - ${worker.status}</t:Subject>
                <t:Body BodyType="Text">${worker.name}: ${worker.status}</t:Body>
                <t:Start>${worker.date}T09:00:00</t:Start>
                <t:End>${worker.date}T17:00:00</t:End>
                <t:CalendarItemType>Single</t:CalendarItemType>
                <t:RequiredAttendees>
                  <t:Attendee>
                    <t:Mailbox>
                      <t:EmailAddress>${COMMON_CALENDAR_EMAIL}</t:EmailAddress>
                    </t:Mailbox>
                  </t:Attendee>
                </t:RequiredAttendees>
              </t:CalendarItem>
            </m:Items>
          </m:CreateItem>
        </soap:Body>
      </soap:Envelope>
    `;

    // Отправляем запрос к EWS
    const response = await fetch(EWS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Authorization': 'Basic ' + btoa(`${username}:${password}`)
      },
      body: soapRequest
    });

    const xmlResponse = await response.text();
    console.log('EWS Response:', xmlResponse);

    // Проверяем, успешно ли создалось событие
    if (response.ok && xmlResponse.includes('CreateItemResponse')) {
      alert('✅ Ereignis wurde erfolgreich zum Kalender hinzugefügt!');
    } else {
      alert('❌ Fehler beim Hinzufügen des Ereignisses. Siehe Konsole für Details.');
    }
  } catch (error) {
    console.error('EWS Error:', error);
    alert(`❌ Fehler: ${error.message}`);
  }
}

// Показываем модальное окно для ввода логина
function showAuthModal() {
  const modal = new bootstrap.Modal(document.getElementById('authModal'));
  modal.show();
}

// Сохраняем учетные данные в sessionStorage
function saveAuth() {
  const username = document.getElementById('outlookUsername').value;
  const password = document.getElementById('outlookPassword').value;

  if (!username || !password) {
    alert('Bitte geben Sie Benutzernamen und Passwort ein!');
    return;
  }

  sessionStorage.setItem('outlookUsername', username);
  sessionStorage.setItem('outlookPassword', password);

  const modal = bootstrap.Modal.getInstance(document.getElementById('authModal'));
  modal.hide();
  alert('✅ Anmeldung erfolgreich! Sie können jetzt Ereignisse erstellen.');
}

// Выход из системы
function logout() {
  sessionStorage.removeItem('outlookUsername');
  sessionStorage.removeItem('outlookPassword');
  alert('Sie wurden abgemeldet.');
}

// Сохраняем токен GitHub
function saveToken() {
  const token = document.getElementById('githubToken').value;
  if (token) {
    localStorage.setItem('githubToken', token);
    const modal = bootstrap.Modal.getInstance(document.getElementById('tokenModal'));
    modal.hide();
    alert('✅ GitHub-Token gespeichert!');
  } else {
    alert('Bitte geben Sie den Token ein!');
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
        message: 'Aktualisierung des Mitarbeiterplans',
        content: content,
        sha: sha
      })
    });

    if (saveResponse.ok) {
      alert('✅ Daten wurden in GitHub gespeichert!');
    } else {
      const error = await saveResponse.json();
      alert(`Fehler: ${error.message}`);
    }
  } catch (error) {
    alert(`Fehler: ${error.message}`);
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
    console.log("Die Datei schedule.json wurde nicht gefunden, eine neue wird erstellt.");
    workers = [];
  }
}

// Проверяем авторизацию при загрузке страницы
window.onload = function() {
  loadData();
  if (!isAuthenticated()) {
    showAuthModal();
  }
};
