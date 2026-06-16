async function saveToGitHub() {
  const token = localStorage.getItem('githubToken');
  if (!token) {
    const modal = new bootstrap.Modal(document.getElementById('tokenModal'));
    modal.show();
    return;
  }

  try {
    // Проверяем, существует ли файл
    let sha = null;
    try {
      const fileResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/schedule.json`, {
        headers: {
          'Authorization': `token ${token}`
        }
      });
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        sha = fileData.sha;
      }
    } catch (error) {
      // Файл не существует - это нормально
    }

    // Кодируем данные в Base64
    const content = btoa(JSON.stringify(workers, null, 2));

    // Формируем тело запроса
    const body = {
      message: 'Aktualisierung des Mitarbeiterplans',
      content: content
    };
    if (sha) {
      body.sha = sha; // Только если файл существует
    }

    // Сохраняем в GitHub
    const saveResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/schedule.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (saveResponse.ok) {
      alert('✅ Daten wurden erfolgreich in GitHub gespeichert!');
      // Обновляем данные из файла
      await loadData();
    } else {
      const error = await saveResponse.json();
      alert(`Fehler: ${error.message}\n\nПроверь токен и права!`);
    }
  } catch (error) {
    alert(`Netzwerkfehler: ${error.message}`);
  }
}
