const url = 'https://fttorztqfvffrgmjtqow.supabase.co/rest/v1/expense_splits?select=amount&limit=1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dG9yenRxZnZmZnJnbWp0cW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTA4MDMsImV4cCI6MjA4OTMyNjgwM30.xKjy05QBP-U0eMkMcCOBh4hfa83jmWWmjr2b5GkFQGU';

fetch(url, {
  method: 'GET',
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
}).then(res => res.json())
  .then(data => {
    console.log("Response:", JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error("Fetch Error:", err);
  });
