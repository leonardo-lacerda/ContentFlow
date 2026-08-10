# Qualificação de providers

Um provider só pode ser habilitado para produção depois de cumprir todos os itens abaixo:

- contrato comercial permite uso em anúncios e processamento do tenant;
- política de retenção, treinamento, subcontratados e exclusão está documentada;
- capability, modelo, preço, limites e região de processamento estão registrados;
- timeout, retry, cancelamento, status e erro são mapeáveis para o gateway;
- output tem URL, MIME, duração/tamanho quando aplicável e pode ser baixado com segurança;
- dados sensíveis não aparecem em logs, headers ou mensagens de erro;
- contrato de ator/voz e escopo de uso são verificáveis;
- dataset de avaliação contém casos normais, extremos e proibidos;
- rollback por variável de ambiente e provider alternativo foram testados.

O fallback de vídeo nunca é anunciado como lip-sync. Cada provider deve ter score de sucesso, latência p95, custo real, taxa de rejeição e aprovação humana por capability.
