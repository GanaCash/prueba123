import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const supabaseUrl = 'https://gggjysnhtlnhxscchmem.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnZ2p5c25odGxuaHhzY2NobWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5ODAwMDgsImV4cCI6MjA1OTU1NjAwOH0._Uirdmxb4d87dqJBWwj2Bl0GFETsB2Yedh-2yL3FEaw';
const supabase = createClient(supabaseUrl, supabaseKey);
const edgeFunctionUrl = `${supabaseUrl}/functions/v1/game-points`;

// Funciones para manejar cookies
function setCookie(name, value, days) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;Secure;SameSite=Strict`;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
}

// Generar o recuperar device_id
function getDeviceId() {
  let deviceId = getCookie('deviceId');
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    setCookie('deviceId', deviceId, 365);
    console.log("Device ID generado y almacenado en cookie:", deviceId);
  } else {
    console.log("Device ID recuperado de cookie:", deviceId);
  }
  return deviceId;
}

// Generar un código corto (6 caracteres alfanuméricos)
function generateShortCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeLength = 6;
  const bytes = crypto.getRandomValues(new Uint8Array(codeLength));
  let code = '';
  for (let i = 0; i < codeLength; i++) {
    code += characters[bytes[i] % characters.length];
  }
  return code;
}

// Validar formato de códigos cortos
function validateCode(code) {
  const validCodePattern = /^[A-Z0-9]{6}$/;
  const sanitizedCode = code.trim().replace(/[<>"'%;()&+]/g, '');
  if (!validCodePattern.test(sanitizedCode)) {
    return { isValid: false, sanitizedCode: null, error: "El código debe ser 6 caracteres alfanuméricos (ejemplo: A1B2C3)" };
  }
  return { isValid: true, sanitizedCode, error: null };
}

// Sincronizar puntos desde el servidor
async function syncPoints(userId) {
  try {
    console.log(`Sincronizando puntos para user_id: ${userId}`);
    const { data, error } = await supabase
      .from('users')
      .select('points')
      .eq('user_id', userId)
      .single();
    if (error) {
      console.error(`Error al sincronizar puntos para user_id: ${userId}`, error);
      throw error;
    }
    const points = data.points || 0;
    setCookie("points", points, 365);
    document.getElementById("points").textContent = points;
    return points;
  } catch (error) {
    console.error("Error al sincronizar puntos:", error);
    document.getElementById("status").textContent = "Error al sincronizar puntos. Intenta de nuevo.";
    throw error;
  }
}

// Generar o recuperar código
async function generateId() {
  console.log("Iniciando generateId...");
  let userId = getCookie("userId");
  const deviceId = getDeviceId();

  // Verificar si el device_id ya está registrado
  const { data: deviceData, error: deviceError } = await supabase
    .from('users')
    .select('user_id, short_code, points')
    .eq('device_id', deviceId);
  if (deviceError) {
    console.error("Error al verificar device_id:", deviceError);
    if (deviceError.code === '429') {
      document.getElementById("status").textContent = "Límite de generación de códigos alcanzado (máximo 3 por IP).";
    } else {
      document.getElementById("status").textContent = "Error al verificar el dispositivo. Intenta de nuevo.";
    }
    return;
  }

  if (deviceData && deviceData.length > 0) {
    console.log("Device ID encontrado en Supabase:", deviceId, "con user_id:", deviceData[0].user_id);
    userId = deviceData[0].user_id;
    setCookie("userId", userId, 365);
    setCookie("points", deviceData[0].points || 0, 365);
    document.getElementById("status").textContent = "Código existente recuperado";
    document.getElementById("currentId").textContent = deviceData[0].short_code;
    document.getElementById("points").textContent = deviceData[0].points || 0;
    document.getElementById("generateBtn").classList.add("hidden");
    document.getElementById("copyButton").classList.remove("hidden");
    return;
  }

  // Verificar si hay una sesión anónima activa
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error("Error al verificar sesión:", sessionError);
    document.getElementById("status").textContent = "Error al verificar la sesión. Intenta de nuevo.";
    return;
  }

  if (sessionData.session && sessionData.session.user) {
    console.log("Sesión anónima activa encontrada:", sessionData.session.user.id);
    userId = sessionData.session.user.id;
    setCookie("userId", userId, 365);

    // Verificar si el user_id ya está en la tabla users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('short_code, points')
      .eq('user_id', userId);
    if (userError) {
      console.error("Error al verificar user_id:", userError);
      if (userError.code === '429') {
        document.getElementById("status").textContent = "Límite de generación de códigos alcanzado (máximo 3 por IP).";
      } else {
        document.getElementById("status").textContent = "Error al verificar el usuario. Intenta de nuevo.";
      }
      return;
    }

    if (userData && userData.length > 0) {
      console.log("User ID encontrado en Supabase:", userId);
      setCookie("points", userData[0].points || 0, 365);
      document.getElementById("status").textContent = "Código existente recuperado";
      document.getElementById("currentId").textContent = userData[0].short_code;
      document.getElementById("points").textContent = userData[0].points || 0;
      document.getElementById("generateBtn").classList.add("hidden");
      document.getElementById("copyButton").classList.remove("hidden");
      return;
    }
  }

  // Generar nueva sesión anónima y código
  try {
    console.log("No hay sesión activa ni device_id registrado, generando nueva...");
    const { data: { user }, error: authError } = await supabase.auth.signInAnonymously();
    if (authError) {
      console.error("Error al autenticar anónimamente:", authError);
      document.getElementById("status").textContent = "Error al autenticar. Intenta de nuevo.";
      return;
    }

    const newId = user.id;
    console.log("ID generado por Supabase Auth:", newId);
    setCookie("userId", newId, 365);

    // Generar un short_code único
    let shortCode;
    let isUnique = false;
    for (let attempts = 0; attempts < 5; attempts++) {
      shortCode = generateShortCode();
      console.log("Intentando short_code:", shortCode);
      const { data: checkCode, error: codeError } = await supabase
        .from('users')
        .select('short_code')
        .eq('short_code', shortCode);
      if (codeError) {
        console.error("Error al verificar short_code:", codeError);
        document.getElementById("status").textContent = "Error al verificar el código. Intenta de nuevo.";
        return;
      }
      if (!checkCode.length) {
        isUnique = true;
        break;
      }
    }

    if (!isUnique) {
      console.error("No se pudo generar un short_code único tras varios intentos");
      document.getElementById("status").textContent = "Error: No se pudo generar un código único. Intenta de nuevo.";
      return;
    }

    // Insertar nuevo usuario con short_code y device_id
    console.log("Insertando nuevo ID en Supabase:", newId, "con short_code:", shortCode, "y device_id:", deviceId);
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert({ user_id: newId, short_code: shortCode, device_id: deviceId, timestamp: Date.now(), points: 0 })
      .select();

    if (insertError) {
      console.error("Error al insertar ID en Supabase:", insertError);
      if (insertError.code === '429') {
        document.getElementById("status").textContent = "Límite de generación de códigos alcanzado (máximo 3 por IP).";
      } else {
        document.getElementById("status").textContent = "Error al guardar el código. Intenta de nuevo.";
      }
      return;
    }

    console.log("ID insertado exitosamente:", insertData);
    setCookie("points", 0, 365);
    document.getElementById("currentId").textContent = shortCode;
    document.getElementById("points").textContent = 0;
    document.getElementById("status").textContent = "Código generado y guardado";
    document.getElementById("generateBtn").classList.add("hidden");
    document.getElementById("copyButton").classList.remove("hidden");
  } catch (error) {
    console.error("Error inesperado en generateId:", error);
    document.getElementById("status").textContent = "Error inesperado al generar el código. Intenta de nuevo.";
  }
}

// Buscar user_id por short_code
async function getUserIdByShortCode(shortCode) {
  const { data, error } = await supabase
    .from('users')
    .select('user_id')
    .eq('short_code', shortCode)
    .single();
  if (error || !data) {
    console.error("Error al buscar user_id por short_code:", error);
    return null;
  }
  return data.user_id;
}

// Usar el código de un amigo
async function useFriendId() {
  const friendCodeInput = document.getElementById("friendId").value;
  const myId = getCookie("userId");

  const { isValid, sanitizedCode, error } = validateCode(friendCodeInput);
  if (!isValid) {
    document.getElementById("status").textContent = error;
    return;
  }

  const friendCode = sanitizedCode;

  if (!friendCode) {
    document.getElementById("status").textContent = "Ingresa un código";
    return;
  }

  try {
    const friendId = await getUserIdByShortCode(friendCode);
    console.log(`Buscando user_id para short_code: ${friendCode}, encontrado: ${friendId}`);
    if (!friendId) {
      document.getElementById("status").textContent = "Código incorrecto.";
      return;
    }

    if (friendId === myId) {
      document.getElementById("status").textContent = "No puedes usar tu propio código";
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      document.getElementById("status").textContent = "No estás autenticado. Genera un código primero.";
      return;
    }
    const deviceFingerprint = user.id;

    const { data: deviceData, error: deviceError } = await supabase
      .from('device_code_usage')
      .select('*')
      .eq('user_id', deviceFingerprint);

    if (deviceError) {
      console.error("Error al verificar dispositivo:", deviceError);
      if (deviceError.code === '429') {
        document.getElementById("status").textContent = "Ya usaste un código amigo (máximo 1 por IP).";
      } else {
        document.getElementById("status").textContent = "Error al verificar el dispositivo. Intenta de nuevo.";
      }
      return;
    }

    if (deviceData.length > 0) {
      document.getElementById("status").textContent = "Este dispositivo ya usó un código previamente";
      return;
    }

    const { data: friendData, error: friendError } = await supabase
      .from('users')
      .select('points')
      .eq('user_id', friendId);

    if (friendError) {
      console.error("Error al verificar código amigo:", friendError);
      document.getElementById("status").textContent = "Error al verificar el código. Intenta de nuevo.";
      return;
    }

    if (!friendData.length) {
      document.getElementById("status").textContent = "Código incorrecto.";
      return;
    }

    // Invocar Edge Function para asignar puntos
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        action: 'assignFriendPoints',
        params: { user_id: myId, friend_id: friendId, device_id: deviceFingerprint }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error al asignar puntos de amigo:", errorData);
      if (response.status === 429) {
        document.getElementById("status").textContent = "Ya usaste un código amigo (máximo 1 por IP).";
      } else {
        document.getElementById("status").textContent = errorData.message || "Error al procesar el código.";
      }
      return;
    }

    await syncPoints(myId);
    document.getElementById("status").textContent = "Código válido, se añadieron 500 puntos a ti y al amigo.";
    document.getElementById("usarid").classList.add("hidden");
    setCookie("buttonHidden", "true", 365);
  } catch (error) {
    console.error("Error en useFriendId:", error);
    document.getElementById("status").textContent = "Error inesperado al procesar el código. Intenta de nuevo.";
  }
}

// Usar el código del dueño
async function useOwnerCode() {
  const ownerCodeInput = document.getElementById("ownerCode").value;
  const myId = getCookie("userId");

  const { isValid, sanitizedCode, error } = validateCode(ownerCodeInput);
  if (!isValid) {
    document.getElementById("status").textContent = error;
    return;
  }

  const ownerCode = sanitizedCode;

  if (!ownerCode) {
    document.getElementById("status").textContent = "Ingresa un código del dueño";
    return;
  }

  try {
    const ownerId = await getUserIdByShortCode(ownerCode);
    if (!ownerId) {
      document.getElementById("status").textContent = "Código del dueño incorrecto.";
      return;
    }

    if (ownerId === myId) {
      document.getElementById("status").textContent = "No puedes usar tu propio código";
      return;
    }

    const hasUsedOwnerCode = getCookie("hasUsedOwnerCode") === "true";
    if (hasUsedOwnerCode) {
      document.getElementById("status").textContent = "Ya has usado un código del dueño";
      return;
    }

    // Invocar Edge Function para asignar puntos
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        action: 'assignOwnerPoints',
        params: { user_id: myId, owner_id: ownerId }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error al asignar puntos del dueño:", errorData);
      document.getElementById("status").textContent = errorData.message || "Error al procesar el código.";
      return;
    }

    await syncPoints(myId);
    document.getElementById("status").textContent = "Código válido, se añadieron 500 puntos a ti y 250 al dueño.";
    document.getElementById("ownerCode").disabled = true;
    document.getElementById("useOwnerCodeBtn").disabled = true;
    setCookie("hasUsedOwnerCode", "true", 365);
  } catch (error) {
    console.error("Error en useOwnerCode:", error);
    document.getElementById("status").textContent = "Error inesperado al procesar el código. Intenta de nuevo.";
  }
}

// Verificar uso de códigos por dispositivo
async function checkDeviceCodeUsage() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn("No hay usuario autenticado para verificar dispositivo");
      return;
    }
    const deviceFingerprint = user.id;

    const { data, error } = await supabase
      .from('device_code_usage')
      .select('*')
      .eq('user_id', deviceFingerprint);

    if (error) throw error;

    if (data.length > 0) {
      document.getElementById("usarid").classList.add("hidden");
      setCookie("buttonHidden", "true", 365);
      document.getElementById("status").textContent = "Este dispositivo ya usó un código previamente";
    }
  } catch (error) {
    console.error("Error al verificar uso del dispositivo:", error);
    document.getElementById("status").textContent = "Error al verificar el dispositivo. Intenta de nuevo.";
  }
}

// Verificar si el código del usuario fue usado
async function checkCodeUsage(myId, currentPoints) {
  try {
    const { data, error } = await supabase
      .from('code_usage')
      .select('*')
      .eq('code', myId);

    if (error) throw error;

    if (data.length > 0) {
      const usageCount = data.length;
      const lastCheckedCount = parseInt(getCookie("lastCheckedCount") || "0");
      const newUsages = usageCount - lastCheckedCount;

      if (newUsages > 0) {
        // Invocar Edge Function para asignar puntos por uso de código
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            action: 'assignCodeUsagePoints',
            params: { user_id: myId, new_usages: newUsages }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error al asignar puntos por uso de código:", errorData);
          document.getElementById("status").textContent = errorData.message || "Error al procesar el uso del código.";
          return;
        }

        setCookie("lastCheckedCount", usageCount, 365);
        await syncPoints(myId);
        document.getElementById("status").textContent =
          `¡Tu código fue usado ${newUsages} veces! Ganaste ${newUsages * 250} puntos.`;
      }
    }
  } catch (error) {
    console.error("Error al verificar uso del código:", error);
    document.getElementById("status").textContent = "Error al verificar el código. Intenta de nuevo.";
  }
}

// Inicializar el juego
async function initializeGame() {
  console.log("Inicializando juegos...");
  try {
    // Obtener lista de juegos desde Supabase
    const { data: games, error } = await supabase
      .from('games')
      .select('game_id, name, points_per_action');
    
    if (error) {
      console.error("Error al obtener juegos:", error);
      document.getElementById("status").textContent = "Error al cargar los juegos.";
      return;
    }

    const gameContainer = document.getElementById("game-container");
    gameContainer.classList.remove("hidden");

    // Crear un botón por cada juego
    games.forEach(game => {
      const gameButton = document.createElement("button");
      gameButton.textContent = `Jugar ${game.name} (+${game.points_per_action} puntos)`;
      gameButton.id = `gameButton-${game.game_id}`;
      gameButton.classList.add("game-button");
      gameContainer.appendChild(gameButton);

      gameButton.addEventListener('click', async () => {
        const myId = getCookie("userId");
        if (!myId) {
          document.getElementById("status").textContent = "Genera un código primero.";
          return;
        }

        try {
          const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              action: 'assignGamePoints',
              params: { user_id: myId, game_id: game.game_id }
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Error al asignar puntos del juego:", errorData);
            if (response.status === 429) {
              document.getElementById("status").textContent = "Demasiadas solicitudes. Espera un momento.";
            } else {
              document.getElementById("status").textContent = errorData.message || "Error al otorgar puntos.";
            }
            return;
          }

          await syncPoints(myId);
          document.getElementById("status").textContent = `¡Ganaste ${game.points_per_action} puntos por jugar ${game.name}!`;
        } catch (error) {
          console.error("Error en el juego:", error);
          document.getElementById("status").textContent = "Error inesperado al otorgar puntos. Intenta de nuevo.";
        }
      });
    });
  } catch (error) {
    console.error("Error al inicializar juegos:", error);
    document.getElementById("status").textContent = "Error al inicializar los juegos.";
  }
}

// Copiar código
function copyId() {
  const shortCode = document.getElementById("currentId").textContent;
  navigator.clipboard.writeText(shortCode).then(() => {
    document.getElementById("status").textContent = "Código copiado al portapapeles";
  }).catch(() => {
    document.getElementById("status").textContent = "Error al copiar el código. Intenta de nuevo.";
  });
}

// Suscripciones en tiempo real
function setupRealtimeSubscriptions(userId) {
  try {
    supabase
      .channel('users')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `user_id=eq.${userId}` }, (payload) => {
        setCookie("points", payload.new.points, 365);
        document.getElementById("points").textContent = payload.new.points;
        console.log("Puntos actualizados en tiempo real:", payload.new.points);
      })
      .subscribe();

    supabase
      .channel('code_usage')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'code_usage', filter: `code=eq.${userId}` }, (payload) => {
        const currentPoints = parseInt(getCookie("points")) || 0;
        checkCodeUsage(userId, currentPoints);
      })
      .subscribe();

    supabase
      .channel('device_code_usage')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'device_code_usage', filter: `user_id=eq.${userId}` }, (payload) => {
        checkDeviceCodeUsage();
      })
      .subscribe();
  } catch (error) {
    console.error("Error al configurar suscripciones en tiempo real:", error);
    document.getElementById("status").textContent = "Error al conectar con actualizaciones en tiempo real.";
  }
}

// Carga inicial
document.addEventListener('DOMContentLoaded', async () => {
  console.log("DOMContentLoaded ejecutado");
  const savedId = getCookie("userId");
  const buttonHidden = getCookie("buttonHidden") === "true";
  const hasUsedOwnerCode = getCookie("hasUsedOwnerCode") === "true";

  console.log("Configurando elementos iniciales...");
  document.getElementById("shareOptions").classList.add("hidden");
  document.getElementById("generateBtn").addEventListener("click", generateId);
  document.getElementById("copyButton").addEventListener("click", copyId);
  document.getElementById("useFriendBtn").addEventListener("click", useFriendId);
  document.getElementById("useOwnerCodeBtn").addEventListener("click", useOwnerCode);

  if (hasUsedOwnerCode) {
    document.getElementById("ownerCode").disabled = true;
    document.getElementById("useOwnerCodeBtn").disabled = true;
    document.getElementById("status").textContent = "Ya has usado un código del dueño previamente.";
  }

  if (buttonHidden) {
    document.getElementById("usarid").classList.add("hidden");
  }

  console.log("Verificando device_id y generando/recuperando código...");
  try {
    await generateId();
    const userId = getCookie("userId");
    if (userId) {
      setupRealtimeSubscriptions(userId);
    }
  } catch (error) {
    console.error("Error al intentar generar/recuperar ID en carga inicial:", error);
    document.getElementById("status").textContent = "Error al generar el código inicial. Intenta de nuevo.";
  }

  console.log("Configurando container-invitar...");
  const miElemento = document.getElementById("container-invitar");
  miElemento.classList.toggle("visible", miElemento.classList.contains("hidden"));

  console.log("Verificando dispositivo...");
  try {
    await checkDeviceCodeUsage();
  } catch (error) {
    console.error("Error al verificar dispositivo:", error);
    document.getElementById("status").textContent = "Error al verificar el dispositivo. Intenta de nuevo.";
  }

  console.log("Inicializando juego...");
  initializeGame();
});