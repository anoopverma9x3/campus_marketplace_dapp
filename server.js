const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// In-memory "database"
let listings = [];
let nextId = 1;

// Get all listings
app.get('/api/listings', (req, res) => {
  res.json(listings);
});

// Create a new listing
app.post('/api/listings', (req, res) => {
  const {
    title,
    description,
    category,
    type,
    price,
    durationUnit,
    location,
    contactEmail,
    contactPhone
  } = req.body;

  if (!title || !type || !price) {
    return res.status(400).json({ error: 'Title, type and price are required.' });
  }

  const listing = {
    id: nextId++,
    title,
    description: description || '',
    category: category || 'other',
    type, // 'rent' or 'sell'
    price,
    durationUnit: durationUnit || 'day',
    location: location || 'Not specified',
    contactEmail: contactEmail || 'helpdapp@gmail.com',
    contactPhone: contactPhone || '+91 8392834933',
    isAvailable: true,
    createdAt: new Date().toISOString()
  };

  listings.push(listing);
  res.status(201).json(listing);
});

// Toggle availability (available <-> not available)
app.patch('/api/listings/:id/toggle', (req, res) => {
  const id = Number(req.params.id);
  const listing = listings.find(l => l.id === id);

  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  listing.isAvailable = !listing.isAvailable;
  res.json(listing);
});

// Fallback: serve index.html for any unknown route (SPA style)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
