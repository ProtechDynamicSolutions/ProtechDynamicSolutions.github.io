/* WorkStay site settings. chatUrl is the Apps Script /exec link (see Leon/apps-script/SETUP.md).
   While it is empty the chat still works, taking the visitor's details step by step without Gemini. */
window.WS_CONFIG = {
  chatUrl: '',
  email: 'bookings@workstay.ie',      // CONFIRM
  phone: '+353 00 000 0000',          // CONFIRM
  teaserAfter: 9000                   // ms before the "Need rooms for a crew?" bubble appears (0 = never)
};
