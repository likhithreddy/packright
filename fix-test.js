const fs = require('fs');
const content = fs.readFileSync('tests/integration/new-trip-modal.test.tsx', 'utf-8');
const newContent = content.replace(
  'expect(await screen.findByText(/Destination must be at least/i)).toBeInTheDocument();',
  'console.log(document.body.innerHTML); expect(await screen.findByText(/Destination must be at least/i)).toBeInTheDocument();'
);
fs.writeFileSync('tests/integration/new-trip-modal.test.tsx', newContent);
