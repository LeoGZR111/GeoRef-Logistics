// login.js
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error en el servidor');
  }
  return res.json();
}

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const data = await postJSON('/auth/login', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value
    });
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);
    window.location.href = 'index.html';
  } catch (err) {
    alert(err.message);
  }
});
