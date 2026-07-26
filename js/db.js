// Client Supabase + accesso dati (tutte le tabelle sono protette da RLS)
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const DB = {
  async conti() {
    const { data, error } = await sb.from('conti')
      .select('*').eq('archiviato', false).order('created_at');
    if (error) throw error;
    return data;
  },

  async addConto(p) {
    const { error } = await sb.from('conti').insert(p);
    if (error) throw error;
  },

  async categorie() {
    const { data, error } = await sb.from('categorie')
      .select('*').order('tipo').order('nome');
    if (error) throw error;
    return data;
  },

  async addCategorie(rows) {
    const { error } = await sb.from('categorie').insert(rows);
    if (error) throw error;
  },

  async movimenti() {
    const { data, error } = await sb.from('movimenti')
      .select('*, categoria:categorie(id,nome,tipo), conto:conti(id,nome)')
      .order('data', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async addMovimento(p) {
    const { error } = await sb.from('movimenti').insert(p);
    if (error) throw error;
  },

  async delMovimento(id) {
    const { error } = await sb.from('movimenti').delete().eq('id', id);
    if (error) throw error;
  }
};
