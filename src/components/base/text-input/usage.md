---
summary: 'Use TextInput for a single line of typed text, such as a name, an email, or a search term.'
---

Place TextInput inside a Field, which labels it and wires its hint and error.
Outside a Field, give it an `aria-label`. It accepts every native `<input>`
attribute and a `ref`; set `type` and `autoComplete` to match the data.

```tsx
<Field label="Project name">
  <TextInput value={name} onChange={(event) => setName(event.currentTarget.value)} />
</Field>
```

Use Textarea for text that runs past one line. The input is 32px tall, 40px on
a coarse pointer, where its text also grows to 16px so phones do not zoom in.
