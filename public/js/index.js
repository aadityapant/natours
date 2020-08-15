/*eslint-disable*/

import '@babel/polyfill';
import { login, logout } from './login';
import { displayMap } from './mapbox';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';

//DOM ELEMENTS
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const logOut_btn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const bookBtn = document.querySelector('#book-tour');

//DELEGATION
if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  document.querySelector('.form').addEventListener('submit', (event) => {
    event.preventDefault();
    //VALUES

    const email = document.querySelector('#email').value;
    const password = document.querySelector('#password').value;
    login(email, password);
  });
}

if (logOut_btn) {
  logOut_btn.addEventListener('click', logout);
}

if (userDataForm) {
  userDataForm.addEventListener('submit', (event) => {
    event.preventDefault();
    // const email = document.querySelector('#email').value;
    // const name = document.querySelector('#name').value;
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);
    updateSettings(form, 'data');
  });
}

if (userDataForm) {
  userPasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    // const form = new FormData();
    // form.append(
    //   'currentPassword',
    //   document.getElementById('password-current').value
    // );
    // form.append('password', document.getElementById('password').value);
    // form.append(
    //   'passwordConfirm',
    //   document.getElementById('password-confirm').value
    // );
    const data = {};
    data.currentPassword = document.getElementById('password-current').value;
    data.password = document.getElementById('password').value;
    data.passwordConfirm = document.getElementById('password-confirm').value;
    document.querySelector('.btn--save').textContent = 'Updating...';
    await updateSettings(data, 'password');
    document.querySelector('.btn--save').textContent = 'Save password';
  });
}

if (bookBtn) {
  bookBtn.addEventListener('click', (e) => {
    //'e.target' selects the current button and dataset for attributes starting with 'data' and the tour-id is converted to the camel case tourId
    e.target.textContent = 'Processing...';
    const tourId = e.target.dataset.tourId;
    bookTour(tourId);
  });
}
