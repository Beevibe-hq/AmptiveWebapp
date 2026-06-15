import os
import re
import glob

files = glob.glob('src/**/*.tsx', recursive=True)
for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    original = content
    
    # Revert small AmptiveSpinners
    content = re.sub(r'<AmptiveSpinner(.*?h-[3456]\b.*?)>', r'<Loader2\1>', content)
    content = re.sub(r'</AmptiveSpinner>', r'</Loader2>', content) # if it had closing tags
    content = re.sub(r'<AmptiveSpinner(.*?)size=\{16\}(.*?)>', r'<Loader2\1size={16}\2>', content)
    content = re.sub(r'<AmptiveSpinner(.*?className="animate-spin".*?)>', r'<Loader2\1>', content)

    # Some empty <AmptiveSpinner /> might be left if they didn't have closing tag. Wait, the above handles self closing too because `>` matches the end.
    
    if content != original:
        # We need to make sure Loader2 is imported.
        if 'Loader2' in content and 'import { Loader2' not in content:
            # Add Loader2 to lucide-react if it exists
            if 'lucide-react' in content:
                content = re.sub(r'import\s+\{([^}]+)\}\s+from\s+[\'"]lucide-react[\'"];', r'import { \1, Loader2 } from "lucide-react";', content)
            else:
                content = "import { Loader2 } from 'lucide-react';\n" + content
                
        # If no AmptiveSpinner left, remove import
        if 'AmptiveSpinner' not in content and 'import { AmptiveSpinner' in content:
            content = re.sub(r"import\s+\{\s*AmptiveSpinner\s*\}\s+from\s+['\"]@/components/AmptiveSpinner['\"];?\n", '', content)

        with open(file, 'w') as f:
            f.write(content)

