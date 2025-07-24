const loadBooks = async () => {
  setLoading(true);

  let query = supabase
      .from('catalog')
      .select('BookID,ISBN13,Title,Authors,MinAge,MaxAge,Thumbnail,Description')
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (appliedFilters) {
    const { minAge, maxAge, author, title } = appliedFilters;

    let min = minAge ? parseInt(minAge) : null;
    let max = maxAge ? parseInt(maxAge) : null;

    if (min !== null && max === null) {
      max = min;
    } else if (max !== null && min === null) {
      min = Math.max(0, max - 3);
    }

    if (min !== null) query = query.gte('MaxAge', min);
    if (max !== null) query = query.lte('MinAge', max);
    if (author) query = query.ilike('Authors', `%${author}%`);
    if (title) query = query.ilike('Title', `%${title}%`);
  }

  const { data: catalogBooks, error: catalogError } = await query;

  if (catalogError) {
    console.error('Error loading catalog:', catalogError);
    setLoading(false);
    return;
  }

  const isbnList = catalogBooks.map(book => book.ISBN13);
  const { data: copyinfo } = await supabase
      .from('copyinfo')
      .select('ISBN13, CopyBooked, AskPrice')
      .in('ISBN13', isbnList);

  const availabilityMap = {};
  const priceMap = {};

  for (const copy of copyinfo) {
    if (!availabilityMap[copy.ISBN13]) availabilityMap[copy.ISBN13] = false;
    if (!copy.CopyBooked) availabilityMap[copy.ISBN13] = true;

    if (
        copy.AskPrice !== null &&
        (!priceMap[copy.ISBN13] || copy.AskPrice < priceMap[copy.ISBN13])
    ) {
      priceMap[copy.ISBN13] = copy.AskPrice;
    }
  }

  const readSet = new Set((hiddenRead || []).map(id => id?.trim().toLowerCase()));

  const droppedBooks = [];
  const filteredBooks = catalogBooks.filter(book => {
    const isbn = book.ISBN13?.trim().toLowerCase();
    const isAvailable = availabilityMap[book.ISBN13];
    const isRead = readSet.has(isbn);

    if (!isbn) {
      droppedBooks.push({ reason: 'Missing ISBN', book });
      return false;
    }
    if (!isAvailable) {
      droppedBooks.push({ reason: 'No available copies', book });
      return false;
    }
    if (isRead) {
      droppedBooks.push({ reason: 'Already read by user', book });
      return false;
    }

    return true;
  });

  console.log('--- Debug Report ---');
  console.log(`Total catalog books fetched: ${catalogBooks.length}`);
  console.log(`Books with available copies: ${catalogBooks.filter(book => availabilityMap[book.ISBN13]).length}`);
  console.log(`Books shown after filtering: ${filteredBooks.length}`);

  console.log('Dropped books with reasons:');
  droppedBooks.forEach(entry => {
    console.log(`[${entry.reason}] ${entry.book.Title} (${entry.book.ISBN13})`);
  });

  console.log('Books included in catalog:');
  filteredBooks.forEach(book => {
    console.log(`[INCLUDED] ${book.Title} (${book.ISBN13})`);
  });

  filteredBooks.forEach(book => {
    book.minPrice = priceMap[book.ISBN13] ?? null;
  });

  const randomized = filteredBooks.sort(() => 0.5 - Math.random());
  setBooks(randomized.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
  setLoading(false);
};
