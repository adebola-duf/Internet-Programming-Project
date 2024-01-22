const vapidPublicKey = "BLaG7DTWYirv2zjzKc9OtHj5GESprfxo6CcplUGCfYQ6rIA_iZ1JGIztrGvQFIla97A2wcFA3yt_Aaw8AQs6T_o";
let reminderTimeouts = {};

async function handleRegistrationFormSubmit(event) {
  event.preventDefault();
  const firstName = document.getElementById('firstName').value;
  const lastName = document.getElementById('lastName').value;
  const email = document.getElementById('email').value;
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
    
  if (password.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
  }
  requestBody = {
    firstName: firstName, 
    lastName: lastName, 
    email: email, 
    username: username,
    password: password
  }
  const response = await fetch("/create-user", {
    method: "POST",
    body: JSON.stringify(requestBody),
    headers: {
        'content-type': 'application/json'
    }
  })

  if (response.ok){
    window.location.href = "login.html";
  }

  alert("Account created successfully.");

}

async function handleLoginFormSubmit(event) {
  event.preventDefault();

  console.log("handleLoginFormSubmit function called... ")
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  requestBody = {
    username: username,
    password: password
  };
  const response = await fetch("/get-user", {
    method: "POST",
    body: JSON.stringify(requestBody),
    headers: {
      'content-type': 'application/json'
    }  
  });
  if (response.ok){
    const data = await response.json();
    const user = data.user;
    localStorage.setItem('userId', user.user_id);
    window.location.href = "main.html";
  }
  else if (response.status == 401){
    alert("Incorrect username or password");
  }
}


function handleMedicationFormSubmit(event) {
  event.preventDefault();
  const medicationDescription = document.getElementById('medicationDescription').value;
  const reminderTime = document.getElementById('reminderTime').value;
  const reminderId = new Date().getTime(); // Using timestamp
  setReminder(reminderTime, medicationDescription, reminderId);

  document.getElementById('medicationDescription').value = '';
  document.getElementById('reminderTime').value = '';
}

async function removeReminder(button) {
  // Get Parent Reminder Element:
  const reminderElement = button.closest('.reminder');
  // Find the corresponding timeout ID and clear the timeout
  const reminderId = reminderElement.getAttribute('id');
  const timeoutId = reminderTimeouts[reminderId];
  clearTimeout(timeoutId);

  reminderElement.remove();
  await fetch(`/del-reminders/${reminderId}`, {
    method: "DELETE",
    headers: {
      'Content-Type': 'application/json',
    },
  })
 
   delete reminderTimeouts[reminderId];
}

async function setReminder(reminderTime, medicationDescription, reminderId) {
  const [date, time] = reminderTime.split('T');
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  const currentTime = new Date();
  const alarmDate = new Date(year, month - 1, day, hours, minutes);

  if (alarmDate < currentTime) {
      alert("Invalid alarm time: it should be in the future");
      return;
  }
  const timeUntilAlarm = alarmDate.getTime() - currentTime.getTime();
  // Set a timeout to execute the alarm action
  const timeoutId = setTimeout(() => {
    if ('serviceWorker' in navigator){
      send(medicationDescription).catch(error => console.log(error));
      const correspondingReminderId = getReminderIdByTimeoutId(timeoutId);
      fetch(`/del-reminders/${correspondingReminderId}`, {
        method: "DELETE"        
      })
      
      const reminderElement = document.getElementById(correspondingReminderId);
      reminderElement.remove();

    }
  }, timeUntilAlarm);
  reminderTimeouts[reminderId] = timeoutId;
  createReminderElement({description: medicationDescription, reminder_time: alarmDate, reminder_id: reminderId});

  const formattedReminderTime = alarmDate.toISOString();
  const requestBody = {
    reminderId: reminderId,
    medicationDescription: medicationDescription,
    userId: localStorage.getItem('userId'),
    reminderTime: formattedReminderTime
  }
  await fetch("/add-reminders", {
    method: "POST",
    body: JSON.stringify(requestBody),
    headers: {
      'content-type': 'application/json'
    }  
  });
  
}


async function loadReminders() {
  // Perform a fetch to get reminders from the server
  fetch(`/get-reminders/${localStorage.getItem("userId")}`)
  .then(response => response.json())
  .then(data => {
    const remindersContainer = document.getElementById('reminders');
    // Clear existing content in case you want to refresh the display
    remindersContainer.innerHTML = '';
    // Loop through each reminder and create a div
    data.forEach(reminder => {
      reminder.reminder_time = new Date(reminder.reminder_time);
      createReminderElement(reminder);
    });

  })
}


function createReminderElement(reminder) {
  // Create a new reminder element
  const reminderElement = document.createElement('div');
  // Add a CSS Class to the Element
  reminderElement.classList.add('reminder');
  reminderElement.setAttribute('id', reminder.reminder_id);
  // Set Inner HTML of the Element:
  const formattedTime = reminder.reminder_time.toLocaleString();
  reminderElement.innerHTML = `${reminder.description} at ${formattedTime}<button class="delete-btn" onclick="removeReminder(this)">Delete</button>`;

  // Append the new reminder to the list
  const remindersList = document.getElementById('reminders');
  remindersList.appendChild(reminderElement);

}

function getReminderIdByTimeoutId(targetTimeoutId) {
  for (const reminderId in reminderTimeouts) {
    if (reminderTimeouts.hasOwnProperty(reminderId) && reminderTimeouts[reminderId] === targetTimeoutId) {
      return reminderId;
    }
  }
  return null;
}

// Register the service worker, the push and we send the push or notification.
async function send(description){
  // Register service worker
  console.log("Registering service worker");
  const register = await navigator.serviceWorker.register("/js/service-worker.js", {
      "scope": "/js/"
  });
  console.log("Service worker registered...")

  // Register push
  console.log("Registering push....")
  const subscription = await register.pushManager.subscribe({
      userVisibleOnly: true, 
      applicationServerKey: vapidPublicKey
  })
  console.log("Push registered.....");

  // send push notifications
  console.log("sending push notifications");
  const response = await fetch("/subscribe", {
      method: "POST",
      body: JSON.stringify({subscription: subscription, reminderReason: description}),
      headers: {
          'content-type': 'application/json'
      }
  })
  console.log("push sent;");
};

function formatDateTime(){

}

document.addEventListener('DOMContentLoaded', function () {
  const registrationForm = document.getElementById('registrationForm');
  if (registrationForm) {
    registrationForm.addEventListener('submit', handleRegistrationFormSubmit);
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm)
    loginForm.addEventListener('submit', handleLoginFormSubmit);

  medicationForm = document.getElementById('medicationForm');
  if (medicationForm){
    loadReminders();
    medicationForm.addEventListener('submit', handleMedicationFormSubmit);

  }

  reminderSettingsForm = document.getElementById('reminderSettingsForm');
  if (reminderSettingsForm)
    reminderSettingsForm.addEventListener('submit', handleReminderSettingsFormSubmit);

});