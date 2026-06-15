import os
import re
import glob

files = glob.glob('src/**/*.tsx', recursive=True)
for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    # Remove Loader2 from lucide-react imports
    if 'lucide-react' in content and 'Loader2' in content:
        # Regex to find Loader2 in imports and remove it
        # Cases: 'Loader2, ', ', Loader2', 'Loader2'
        new_content = re.sub(r'\bLoader2\s*,\s*', '', content)
        new_content = re.sub(r',\s*\bLoader2\b', '', new_content)
        new_content = re.sub(r'{\s*\bLoader2\b\s*}', '{}', new_content)
        
        if new_content != content:
            with open(file, 'w') as f:
                f.write(new_content)

