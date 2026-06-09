import os
import re
from typing import List, Dict, Any
from pypdf import PdfReader

def extract_text_from_file(file_path: str) -> str:
    """Extract raw text from a given file path based on its extension."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
        
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == ".pdf":
        text = ""
        try:
            reader = PdfReader(file_path)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        except Exception as e:
            print(f"Error parsing PDF with pypdf: {e}. Falling back to clean read.")
            # Fallback
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        return text
    else:
        # Txt, markdown, csv, docx, etc. fallback
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

def chunk_text(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> List[Dict[str, Any]]:
    """
    Split text into overlapping chunks.
    Each chunk is a dictionary containing the chunk text, start/end indices, and metadata.
    """
    # Clean whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Custom recursive character splitter simulation
    words = text.split(' ')
    chunks = []
    
    if not words or words == ['']:
        return chunks
        
    current_word_idx = 0
    chunk_index = 0
    
    while current_word_idx < len(words):
        # Build chunk
        chunk_words = []
        char_count = 0
        
        # Add words until we reach the chunk_size or run out of words
        i = current_word_idx
        while i < len(words) and char_count < chunk_size:
            word = words[i]
            chunk_words.append(word)
            char_count += len(word) + 1  # count the space
            i += 1
            
        chunk_text_str = " ".join(chunk_words)
        chunks.append({
            "chunk_id": chunk_index,
            "text": chunk_text_str,
            "char_count": len(chunk_text_str),
            "word_count": len(chunk_words)
        })
        
        # Advance current_word_idx by chunk_size - overlap (approximated in words)
        # Assuming average word length is 5-6 characters, overlap of 50 chars is ~8-10 words
        overlap_words = max(1, int(chunk_overlap / 6))
        step = len(chunk_words) - overlap_words
        if step <= 0:
            step = 1
            
        current_word_idx += step
        chunk_index += 1
        
    return chunks
