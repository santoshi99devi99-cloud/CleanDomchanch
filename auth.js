const button = document.getElementById('googleLogin');
const accountName = document.getElementById('accountName');
const status = document.getElementById('authStatus');
let currentUser = null;
let busy = false;

function render(user) {
  currentUser = user;
  accountName.hidden = !user;
  accountName.textContent = user ? (user.name || user.email || 'Signed in') : '';
  button.textContent = user ? 'Sign out' : 'Sign in with Google';
  button.disabled = false;
  button.removeAttribute('aria-busy');
}

try {
  const identity = await import('https://esm.sh/@netlify/identity@2.0.0');
  identity.onAuthChange((_event, user) => render(user));
  const callback = new URLSearchParams(window.location.hash.slice(1));
  if (callback.has('error') || callback.has('error_description')) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
    status.textContent = 'Google sign-in was canceled or unsuccessful. Please try again.';
  }
  try {
    const result = await identity.handleAuthCallback();
    render(result?.user || await identity.getUser());
    if (result?.type === 'oauth') status.textContent = 'You are signed in with Google.';
  } catch {
    // Remove unsuccessful callback credentials from the address bar too.
    if (callback.has('access_token')) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    render(null);
    status.textContent = 'Unable to complete sign-in. Please try again.';
  }

  button.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    status.textContent = '';
    try {
      if (currentUser) {
        await identity.logout();
        render(null);
        status.textContent = 'You are signed out.';
      } else {
        const settings = await identity.getSettings();
        if (!settings.providers.google) {
          status.textContent = 'Google sign-in is not available yet. Please try again later.';
          return;
        }
        status.textContent = 'Connecting to Google…';
        try {
          identity.oauthLogin('google');
        } catch (error) {
          // The SDK signals its successful navigation with this exception.
          if (error.message !== 'Redirecting to OAuth provider') throw error;
        }
      }
    } catch {
      status.textContent = currentUser
        ? 'Unable to sign out. Please try again.'
        : 'Unable to connect to Google sign-in. Please try again.';
    } finally {
      busy = false;
      render(currentUser);
    }
  });
} catch {
  button.disabled = true;
  button.textContent = 'Sign-in unavailable';
  status.textContent = 'Sign-in could not load. Please refresh the page to try again.';
}
