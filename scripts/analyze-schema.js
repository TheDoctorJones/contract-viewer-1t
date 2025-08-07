// Let's fetch and analyze the CSV file to understand the contract attributes structure
async function analyzeContractSchema() {
  try {
    console.log('Fetching contract schema CSV...');
    const response = await fetch('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Agreement%20Types%20and%20Fields%20-%20DocuSign%20%2B%20Lexion%20fields%20per%20Type-qLmM9gxbM69MMSZH0ZigRNZ3UDXwEK.csv');
    const csvText = await response.text();
    
    console.log('Raw CSV content (first 1000 characters):');
    console.log(csvText.substring(0, 1000));
    
    // Parse CSV manually since we don't have a CSV library
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    console.log('\nCSV Headers:');
    console.log(headers);
    
    console.log('\nFirst few data rows:');
    for (let i = 1; i < Math.min(6, lines.length); i++) {
      if (lines[i].trim()) {
        const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
        console.log(`Row ${i}:`, row);
      }
    }
    
    // Count total rows
    const dataRows = lines.slice(1).filter(line => line.trim());
    console.log(`\nTotal data rows: ${dataRows.length}`);
    
    // Analyze agreement types (assuming first column contains field names)
    const fieldNames = dataRows.map(row => {
      const cells = row.split(',');
      return cells[0] ? cells[0].trim().replace(/"/g, '') : '';
    }).filter(name => name);
    
    console.log('\nSample field names:');
    fieldNames.slice(0, 20).forEach(name => console.log(`- ${name}`));
    
  } catch (error) {
    console.error('Error analyzing schema:', error);
  }
}

analyzeContractSchema();
