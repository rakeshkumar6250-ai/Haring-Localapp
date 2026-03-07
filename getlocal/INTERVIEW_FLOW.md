# GetLocal Voice Interview Flow

## Interview Structure

### Phase 1: Initial Tap
- User taps the massive pulsing mic button
- AI plays: "Welcome to GetLocal. Please select your language..."

### Phase 2: Language Selection
Three language options displayed:
- **English** (en) → Voice prompts in en-US
- **हिंदी** (hi) → Voice prompts in hi-IN  
- **తెలుగు** (te) → Voice prompts in te-IN

### Phase 3: Structured Interview (3 Questions)
Each question is:
1. Spoken by AI in selected language
2. User records their answer
3. Tap to stop and move to next

**Questions:**
1. "Please tell us your full name"
2. "What type of work are you looking for?"
3. "How many years of experience do you have?"

### Phase 4: Upload & Processing
- All recordings combined into single .webm file
- Filename tagged: `{candidateId}_lang-{langCode}.webm`
- Metadata saved for MoltBot:
  ```json
  {
    "lang_code": "hi",
    "interview_metadata": {
      "type": "structured_3q",
      "questions_answered": 3,
      "translation_model": "whisper-large-v3-hindi"
    }
  }
  ```

## Translation Model Mapping
| Language | Code | Whisper Model |
|----------|------|---------------|
| English | en | whisper-large-v3 |
| Hindi | hi | whisper-large-v3-hindi |
| Telugu | te | whisper-large-v3-telugu |
| Tamil | ta | whisper-large-v3-tamil |

## MoltBot Integration Hook
Audio files are saved to: `/public/audio/{candidateId}_lang-{langCode}.webm`

Backend logs emit:
```
[MOLTBOT HOOK] Ready for processing: /audio/xxx_lang-hi.webm
```

MoltBot should watch this directory and use the `translation_model` from candidate metadata.
