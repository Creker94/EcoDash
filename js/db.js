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
  },

  async scadenze() {
    const { data, error } = await sb.from('scadenze')
      .select('*').eq('archiviata', false).order('data_scadenza');
    if (error) throw error;
    return data;
  },

  async addScadenza(p) {
    const { error } = await sb.from('scadenze').insert(p);
    if (error) throw error;
  },

  async updScadenza(id, patch) {
    const { error } = await sb.from('scadenze').update(patch).eq('id', id);
    if (error) throw error;
  },

  async delScadenza(id) {
    const { error } = await sb.from('scadenze').delete().eq('id', id);
    if (error) throw error;
  },

  async beni() {
    const { data, error } = await sb.from('beni')
      .select('*').order('venduto').order('created_at');
    if (error) throw error;
    return data;
  },

  async addBene(p) {
    const { error } = await sb.from('beni').insert(p);
    if (error) throw error;
  },

  async updBene(id, patch) {
    const { error } = await sb.from('beni').update(patch).eq('id', id);
    if (error) throw error;
  },

  async delBene(id) {
    const { error } = await sb.from('beni').delete().eq('id', id);
    if (error) throw error;
  }
};
