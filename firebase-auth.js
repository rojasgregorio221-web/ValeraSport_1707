// firebase-auth.js
//
// Reemplaza al widget de Netlify Identity. Se incluye con:
//   <script type="module" src="firebase-auth.js"></script>
// en cada página que necesite saber si el cliente inició sesión con Google.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAC7ua6BL3dThoVAm7d8AbVuaJHOhhABL4",
  authDomain: "valera-sport-fa4ab.firebaseapp.com",
  projectId: "valera-sport-fa4ab",
  storageBucket: "valera-sport-fa4ab.firebasestorage.app",
  messagingSenderId: "919920299555",
  appId: "1:919920299555:web:4404eb0d054e63a64ceb96",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const proveedorGoogle = new GoogleAuthProvider();

// Disponibles globalmente para el resto de los scripts de cada página.
window.firebaseAuth = auth;
window.firebaseSignIn = () => signInWithPopup(auth, proveedorGoogle);
window.firebaseSignOut = () => signOut(auth);

// Cada vez que cambia el estado de sesión (al cargar la página, al iniciar
// o cerrar sesión), avisamos al resto del sitio con un evento normal del
// navegador -- así el código existente solo necesita escuchar este evento
// en vez de depender de la API de Netlify Identity.
onAuthStateChanged(auth, (user) => {
  window.usuarioActual = user; // null si no hay sesión, o el usuario de Firebase
  window.dispatchEvent(new CustomEvent("firebase-auth-changed", { detail: { user } }));
});