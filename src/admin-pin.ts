const KEY = "registro-gallero-admin-pin-v1";
type Secret = { salt: string; hash: string };
type Access = Secret & {
  recovery?: Secret & { question: string };
  master?: Secret;
};
const hex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(bytes instanceof Uint8Array ? bytes.buffer : bytes))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
async function digest(value: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(value),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return hex(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt as BufferSource,
        iterations: 150000,
        hash: "SHA-256",
      },
      key,
      256,
    ),
  );
}
function read(): Access | undefined {
  const value = localStorage.getItem(KEY);
  if (!value) return;
  try {
    const record = JSON.parse(value);
    for (const secret of [record, record.master, record.recovery].filter(
      Boolean,
    ))
      if (
        !/^[a-f0-9]{32}$/.test(secret.salt) ||
        !/^[a-f0-9]{64}$/.test(secret.hash)
      )
        throw Error();
    return record;
  } catch {
    throw Error(
      "El acceso local no se puede leer. Conserva una copia JSON de tus datos.",
    );
  }
}
function validPIN(pin: string) {
  if (!/^\d{6,12}$/.test(pin)) throw Error("Usa un PIN de 6 a 12 dígitos.");
}
async function secret(value: string): Promise<Secret> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: hex(salt), hash: await digest(value, salt) };
}
async function verify(value: string, record?: Secret) {
  return (
    !!record &&
    (await digest(
      value,
      Uint8Array.from(record.salt.match(/.{2}/g) as string[], (v) =>
        parseInt(v, 16),
      ),
    )) === record.hash
  );
}
const normalizedAnswer = (v: string) =>
  v.normalize("NFKC").trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
export const hasPIN = () => !!localStorage.getItem(KEY);
export async function setPIN(pin: string) {
  validPIN(pin);
  const stored = read();
  if (await verify(pin, stored?.master))
    throw Error("El PIN principal debe ser distinto del maestro.");
  localStorage.setItem(
    KEY,
    JSON.stringify({ ...stored, ...(await secret(pin)) }),
  );
}
export async function checkPIN(pin: string) {
  return verify(pin, read());
}
export function accessMethods() {
  const record = read();
  return {
    recovery: !!record?.recovery,
    question: record?.recovery?.question || "",
    master: !!record?.master,
  };
}
export async function checkMasterPIN(pin: string) {
  return verify(pin, read()?.master);
}
export async function configureAccess(
  current: string,
  values: {
    question: string;
    answer: string;
    master: string;
    removeRecovery?: boolean;
    removeMaster?: boolean;
  },
) {
  const stored = read();
  if (
    !stored ||
    !((await verify(current, stored)) || (await verify(current, stored.master)))
  )
    throw Error(
      "Confirma tu PIN principal o maestro actual para cambiar los métodos.",
    );
  const next = { ...stored };
  if (values.removeRecovery) delete next.recovery;
  else if (values.answer) {
    const answer = normalizedAnswer(values.answer);
    if (
      answer.length < 3 ||
      answer.length > 200 ||
      values.question.trim().length < 5 ||
      values.question.length > 200
    )
      throw Error(
        "Escribe una pregunta de 5 a 200 caracteres y una respuesta de 3 a 200.",
      );
    next.recovery = {
      ...(await secret(answer)),
      question: values.question.trim(),
    };
  } else if (values.question !== (stored.recovery?.question || ""))
    throw Error("Introduce también la respuesta para cambiar la pregunta.");
  if (values.removeMaster) delete next.master;
  else if (values.master) {
    validPIN(values.master);
    if (await verify(values.master, stored))
      throw Error("El PIN maestro debe ser diferente del principal.");
    next.master = await secret(values.master);
  }
  localStorage.setItem(KEY, JSON.stringify(next));
}
export async function recoverPIN(answer: string, newPIN: string) {
  const stored = read();
  if (
    !stored?.recovery ||
    !(await verify(normalizedAnswer(answer), stored.recovery))
  )
    throw Error("La respuesta de recuperación no coincide.");
  validPIN(newPIN);
  if (await verify(newPIN, stored.master))
    throw Error("El PIN principal debe ser distinto del maestro.");
  localStorage.setItem(
    KEY,
    JSON.stringify({ ...stored, ...(await secret(newPIN)) }),
  );
}
