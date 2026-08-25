const passcodeInput = document.getElementById('passcodeInput');
const loginBtn = document.getElementById('loginBtn');
const loginMsg = document.getElementById('loginMsg');

const DRIVER_TOKEN_KEY = 'novashuttle_driver_token';

function setMsg(text, type = '') {
  loginMsg.textContent = text;
  loginMsg.className = `msg ${type}`.trim();
}

async function loginDriver() {
  const passcode = String(passcodeInput.value || '').trim();
  if (!passcode) {
    setMsg('Please enter your driver passcode.', 'error');
    return;
  }

  setMsg('Signing in...', 'success');

  try {
    const response = await fetch('/api/driver/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ passcode })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Unable to login.');
    }

    localStorage.setItem(DRIVER_TOKEN_KEY, payload.token || '');
    window.location.href = '/driverview';
  } catch (error) {
    setMsg(error.message, 'error');
  }
}

loginBtn.addEventListener('click', () => {
  void loginDriver();
});

passcodeInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    void loginDriver();
  }
});
