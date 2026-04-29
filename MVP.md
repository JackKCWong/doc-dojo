# docu-dojo

docu-dojo is a web application that facilitates users to engineer and optimize their prompt with document related tasks like Information Extraction, Summarization, Q&A etc.

## UI Design

The landing page is the main page of the app that takes up the entire width of the screen. It has 3 main sections:

1. The left section is the document section where the user can upload their documents, preview them and select the document they want to work on.
2. The middle section is the prompt engineering section where the user can create/edit and finetune their prompts and define expected output of the current task.
3. The right section is a chat section where user can chat with the LLM to give feedback and suggestions on how to improve the prompt.

### Document Section

* it takes up 30% of the total width on the left.
* it starts with a drop area that allows users to drag and drop PDF / image files into the app.
* it shows a list of uploaded files on the left as vertical tabs, which takes up 10% of the width.
* the remaining 20% of the width is for the document area with 2 tabs: preview and text content.
* when a file is selected, it will be displayed in the preview tab.
* if the file is a PDF, it will be displayed in the browser built-in previewer.
* if the file is an image, it will be converted to a PDF and displayed in the browser built-in previewer.
* the text content tab is mainly a Monaco editor that allows users to edit the text content of the PDF file.
* if the PDF file has a text layer, the text content will be displayed in the text content editor, in the format of: 
```
# page <x>
<text content of page x>
```
* if the PDF file does not have a text layer, the text content editor will be empty.

### Prompt Engineering Section

* it takes up 40% of the total width in the middle.
* the top 60% is the prompt editors, which are 3 Monaco editors, with each in its own tab:  
    * original: allows users to edit the prompt, with markdown syntax highlight.
    * optimized: read-only, displays the LLM generated prompt, with markdown syntax highlight.
    * diff: shows the diff between the original and optimized prompts.
* the bottom 40% are the output editors, which are 3 Monaco editors:
    * expected output: allows users to edit the expected output, with json syntax highlight.
    * actual output: read-only, displays the actual output of the prompt, with json syntax highlight.
    * diff: shows the diff between the expected and actual outputs.

### Chat Section

* it takes up 30% of the total width on the right.
* it is a chat window that allows users to chat with the LLM to give feedback and suggestions on how to improve the prompt.
* the chat window is a typical chatbot interface, with a message input box at the bottom and a message list on the top.
* the message list shows the messages sent by the user and the LLM.
* the message input box allows users to type in their messages and send them to the LLM by pressing enter or clicking the 'Optimize' button and calling `POST /api/v1/prompt-optimization`
* the api will respond to the user's messages with a prompt suggestion and a reason in a streaming fashion. Refer to API Design section below.
* a 'Test' button next to the 'Optimize' button allows users to calls `POST /api/v1/prompt-execution` and displays the result in 'actual output'.

### Status Bar

At the bottom of the page, there is a status bar that shows various stats about the current task:

* number of pages in the document
* number of tokens in the text content
* number of tokens in the original prompt
* number of tokens in the optimized prompt
* number of tokens in the expected output

### Technical Details

* Next.js is used as the framework for the front-end.
* Monaco Editor is used as the code editor for the prompt editors and the expected output editor.
* The LLM is powered by OpenAI compatible API.
* tiktoken is used for tokenization of the text content and the prompt.


## API design

### POST /api/v1/prompt-optimzation

This endpoint takes in a JSON object with the following fields:

```json
{
    "context": "string",
    "prompt": "string",
    "expected_output": "object",
    "feedback": "string"
}
```

It does the following:

* replace the `{{context}}` in the prompt with the `context` field.
* convert `expected_output` to json schema using `quicktype-core`.
* append the output schema to the prompt.
* use a meta-prompt as system prompt to call the LLM to generate an optimized prompt based on the the feedback, using streaming.

The endpoint passes on the LLM streaming response to the client as-is.


### POST /api/v1/prompt-execution

This endpoint takes in a JSON object with the following fields:

```json
{
    "context": "string",
    "prompt": "string",
    "expected_output": "string"
}
```

It does the following:

* replace the `{{context}}` in the prompt with the `context` field.
* convert `expected_output` to zod schema using `quicktype-core`
* call the LLM with the prompt and return the result.

### Technical Details

* use OpenAI compatible API.
* use `@instructor-ai/instructor` for structured output.
