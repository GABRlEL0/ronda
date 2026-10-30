import readline from "node:readline";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    let muted = false;
    // Oculta lo que se escribe (contraseña) sin mostrar caracteres.
    rl._writeToOutput = (text) => {
      if (!muted) rl.output.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
    muted = hidden;
  });
}

// Login de admin para scripts. Usa SEED_EMAIL / SEED_PASSWORD si están
// definidas; si no, las pide por terminal.
export async function signInAdmin(app) {
  const email = (process.env.SEED_EMAIL || (await ask("Email admin: "))).trim();
  const password =
    process.env.SEED_PASSWORD || (await ask("Contraseña: ", { hidden: true }));

  try {
    await signInWithEmailAndPassword(getAuth(app), email, password);
  } catch (error) {
    const messages = {
      "auth/invalid-email": "El email no es válido.",
      "auth/invalid-credential": "Email o contraseña incorrectos.",
      "auth/wrong-password": "Email o contraseña incorrectos.",
      "auth/user-not-found": "No existe un usuario con ese email.",
      "auth/too-many-requests": "Demasiados intentos. Esperá unos minutos.",
    };
    console.error(`✖ No se pudo iniciar sesión: ${messages[error.code] || error.message}`);
    process.exit(1);
  }
}
