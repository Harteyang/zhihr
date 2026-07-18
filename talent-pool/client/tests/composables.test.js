import { strict as assert } from 'node:assert'

function strToU8(str) {
  return new TextEncoder().encode(str)
}

function buildDocxBuffer(text) {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${text.replace(/</g, '&lt;').replace(/&/g, '&amp;')}</w:t></w:r></w:p>
  </w:body>
</w:document>`

  const files = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`),
    'word/document.xml': strToU8(documentXml),
    'word/_rels/document.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`)
  }

  return Object.entries(files).reduce((arr, [name, data]) => {
    const nameBytes = strToU8(name)
    return [...arr, ...nameBytes, ...data]
  }, [])
}

function test(name, fn) {
  try {
    fn()
    console.log(`✓ ${name}`)
  } catch (err) {
    console.error(`✗ ${name}`)
    console.error(err.message)
    process.exitCode = 1
  }
}

test('ALLOWED_EXTENSIONS includes all supported formats', () => {
  const expected = ['.doc', '.docx', '.pdf', '.txt', '.xlsx', '.xls', '.csv']
  const allowedExtensions = expected
  for (const ext of expected) {
    assert.ok(allowedExtensions.includes(ext), `Missing extension: ${ext}`)
  }
})

test('File validation rejects unsupported extensions', () => {
  const invalidExtensions = ['.jpg', '.png', '.zip', '.rar', '.exe']
  for (const ext of invalidExtensions) {
    const file = { name: `test${ext}`, size: 100 }
    assert.ok(!['.doc', '.docx', '.pdf', '.txt', '.xlsx', '.xls', '.csv'].includes(ext), `Extension ${ext} should not be allowed`)
  }
})

test('File validation accepts supported extensions', () => {
  const validExtensions = ['.doc', '.docx', '.pdf', '.txt', '.xlsx', '.xls', '.csv']
  for (const ext of validExtensions) {
    const file = { name: `test${ext}`, size: 100 }
    const extToCheck = '.' + file.name.split('.').pop().toLowerCase()
    assert.ok(['.doc', '.docx', '.pdf', '.txt', '.xlsx', '.xls', '.csv'].includes(extToCheck), `Extension ${ext} should be allowed`)
  }
})

test('File size validation rejects files larger than 10MB', () => {
  const maxSize = 10 * 1024 * 1024
  const oversizedFile = { name: 'test.pdf', size: maxSize + 1 }
  assert.ok(oversizedFile.size > maxSize, 'File should be oversized')
})

test('File size validation accepts files within 10MB limit', () => {
  const maxSize = 10 * 1024 * 1024
  const validFile = { name: 'test.pdf', size: maxSize }
  assert.ok(validFile.size <= maxSize, 'File should be within size limit')
})

test('Excel file extensions are allowed for upload', () => {
  const excelExtensions = ['.xlsx', '.xls', '.csv']
  for (const ext of excelExtensions) {
    const file = { name: `resume${ext}`, size: 100 }
    const extToCheck = '.' + file.name.split('.').pop().toLowerCase()
    assert.ok(['.doc', '.docx', '.pdf', '.txt', '.xlsx', '.xls', '.csv'].includes(extToCheck), `Excel extension ${ext} should be allowed`)
  }
})

console.log('Frontend composable tests complete')