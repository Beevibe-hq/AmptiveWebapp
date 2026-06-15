import os
import re
import glob

files = glob.glob('src/**/*.tsx', recursive=True)
for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    if '<Loader2' in content or 'Loader2' in content:
        # Check if we need to add import
        if 'AmptiveSpinner' not in content:
            # Find the last import
            imports = list(re.finditer(r'^import .*;', content, re.MULTILINE))
            if imports:
                last_import = imports[-1]
                content = content[:last_import.end()] + "\nimport { AmptiveSpinner } from '@/components/AmptiveSpinner';" + content[last_import.end():]
            else:
                content = "import { AmptiveSpinner } from '@/components/AmptiveSpinner';\n" + content
        
        # Replace JSX tags
        content = content.replace('<Loader2', '<AmptiveSpinner')
        content = content.replace('</Loader2>', '</AmptiveSpinner>')
        
        # Write back
        with open(file, 'w') as f:
            f.write(content)

