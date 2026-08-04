Modal de confirmação ou formulário curto. Título afirma o que vai acontecer, sem "Tem certeza?".

```jsx
<Dialog title="Cancelar o agendamento?" description="A maisa avisa a Juliana no WhatsApp na hora."
  onClose={fechar}
  footer={<><Button variant="secondary" onClick={fechar}>Voltar</Button><Button variant="danger">Cancelar agendamento</Button></>} />
```
