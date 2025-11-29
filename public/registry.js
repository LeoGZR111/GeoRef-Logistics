// registry.js
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

document.getElementById('register-form').addEventListener('submit', async e => {
    e.preventDefault();
    try {
        await postJSON('/auth/register', {
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-password').value
        });
        alert('Usuario registrado, ahora inicia sesión');
        window.location.href = 'login.html';
    } catch (err) {
        alert(err.message);
    }
});
