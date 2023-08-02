const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  try {
    // Get the path to the test.json file
    const filePath = path.join(process.cwd(), 'public/search-data-condensed.json');

    // Read the contents of the file
    const jsonData = fs.readFileSync(filePath, 'utf8');

    let parsedData;
    try {
      parsedData = JSON.parse(jsonData);
    } catch (parseError) {
      // Handle JSON parsing error
      console.error('Error parsing JSON data:', parseError);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (!Array.isArray(parsedData)) {
      console.error('parsedData is not an array');
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const slugs = parsedData.map(item => item.route);

    // Respond with the JSON data (no need to stringify here)
    res.status(200).json({ slugs });
  } catch (error) {
    // If there's an error reading the file, return an error response
    console.error('Error reading test.json:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
