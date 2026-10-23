// ============================================================
// Todas as contas, em páginas (23/10/2026)
// ============================================================
// `auth.admin.listUsers` devolve no máximo 1000 contas por chamada, calado:
// sem paginar, a conta nº 1001 some do resumo semanal, dos alertas, do login
// com Google e do admin — e nada avisa. Em 23/10/2026 eram 916 contas, então
// o corte estava a poucas semanas. Este helper é o substituto direto da
// chamada antiga: mesmo formato de retorno ({ data: { users }, error }).
// ============================================================
export async function listarTodosUsuarios(client) {
  const users = [];
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { data: { users }, error };
    const lote = data?.users || [];
    users.push(...lote);
    if (lote.length < 1000) break;
  }
  return { data: { users }, error: null };
}
