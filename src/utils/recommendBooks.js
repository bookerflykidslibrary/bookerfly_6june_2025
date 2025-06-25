import supabase from '../utils/supabaseClient';

export async function recommendBooks({ userid, remaining, childAge }) {
  if (remaining <= 0) return;

  const { data: books, error } = await supabase
    .from('catalog')
    .select('ISBN13')
    .lte('MinAge', childAge)
    .gte('MaxAge', childAge)
    .order('random')
    .limit(remaining);

  if (error || !books || books.length === 0) {
    throw new Error("No suitable books found");
  }

  for (let book of books) {
    const { data: existingSerials } = await supabase
      .from('circulationfuture')
      .select('SerialNumberOfIssue')
      .eq('userid', userid)
      .eq('ISBN13', book.ISBN13)
      .order('SerialNumberOfIssue', { ascending: false })
      .limit(1);

    const nextSerial = (existingSerials?.[0]?.SerialNumberOfIssue || 0) + 1;

    await supabase.from('circulationfuture').insert({
      userid,
      ISBN13: book.ISBN13,
      SerialNumberOfIssue: nextSerial,
    });
  }
}
