importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBlNQtRU_EmLGeUzcspfGNi4Hr1H3sdDqU",
    authDomain: "barber-app-6993a.firebaseapp.com",
    projectId: "barber-app-6993a",
    storageBucket: "barber-app-6993a.firebasestorage.app",
    messagingSenderId: "1091592092089", 
    appId: "1:1091592092089:android:03dad6d101f55c9beade68"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.image || '/favicon.ico'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
