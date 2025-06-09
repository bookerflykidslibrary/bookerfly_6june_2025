const handleReview = async () => {
  const filtered = bookInputs.filter(entry => entry.value.trim() !== '');
  if (!customerId || filtered.length === 0) {
    setMessage('Please enter Customer ID and at least one Book ID/ISBN.');
    return;
  }

  let allBooks = [];

  for (let entry of filtered) {
    let copy = null;

    if (entry.type === 'CopyLocationID') {
      const { data: copyData } = await supabase
        .from('copyinfo')
        .select('CopyID, ISBN13')
        .eq('CopyLocationID', entry.value)
        .eq('CopyBooked', false)
        .single();
      if (copyData) copy = copyData;
    } else if (entry.type === 'ISBN13') {
      const { data: copyData } = await supabase
        .from('copyinfo')
        .select('CopyID, ISBN13')
        .eq('ISBN13', entry.value)
        .eq('CopyLocation', adminLocation)
        .eq('CopyBooked', false)
        .limit(1)
        .maybeSingle();
      if (copyData) copy = copyData;
    }

    if (!copy) {
      allBooks.push({ error: `❌ No available copy found for ${entry.value}` });
      continue;
    }

    const { data: book } = await supabase
      .from('catalog')
      .select('Title, Authors, ISBN13, Thumbnail')
      .eq('ISBN13', copy.ISBN13)
      .single();

    if (book) {
      allBooks.push({ ...book, CopyID: copy.CopyID });
    }
  }

  setBooks(allBooks);
  setConfirming(true);
  setMessage('');
};

const handleConfirm = async () => {
  const today = new Date().toISOString();

  const records = books
    .filter(b => b.CopyID)
    .map(book => ({
      LibraryBranch: adminLocation,
      ISBN13: book.ISBN13,
      BookingDate: today,
      MemberID: customerId,
      ReturnDate: null,
      Comment: '',
      CopyID: book.CopyID,
    }));

  const { error: insertError } = await supabase
    .from('circulationhistory')
    .insert(records);

  if (insertError) {
    setMessage('Error issuing books: ' + insertError.message);
    return;
  }

  // Mark copies as booked
  await Promise.all(
    books.map(b =>
      b.CopyID
        ? supabase
            .from('copyinfo')
            .update({ CopyBooked: true })
            .eq('CopyID', b.CopyID)
        : null
    )
  );

  setMessage('✅ Books issued successfully!');
  setConfirming(false);
  setBooks([]);
  setBookInputs(Array(10).fill({ value: '', type: 'ISBN13' }));
  setCustomerId('');
};
