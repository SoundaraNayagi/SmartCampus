
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  college TEXT NOT NULL DEFAULT '',
  degree TEXT NOT NULL DEFAULT '',
  graduation_year INTEGER,
  skills TEXT[] NOT NULL DEFAULT '{}',
  target_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  technologies TEXT[] NOT NULL DEFAULT '{}',
  github_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_own" ON public.projects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT NOT NULL DEFAULT '',
  year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certifications TO authenticated;
GRANT ALL ON public.certifications TO service_role;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certifications_own" ON public.certifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer INTEGER NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'Easy',
  explanation TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_questions_read" ON public.quiz_questions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_results TO authenticated;
GRANT ALL ON public.quiz_results TO service_role;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_results_own" ON public.quiz_results FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, college, degree)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'college', ''),
    COALESCE(NEW.raw_user_meta_data->>'degree', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.quiz_questions (question, options, correct_answer, category, difficulty, explanation) VALUES
('If a train travels 300 km in 5 hours, what is its average speed?', ARRAY['50 km/h','60 km/h','65 km/h','70 km/h'], 1, 'Aptitude', 'Easy', 'Speed = distance / time = 300/5 = 60 km/h.'),
('What is 15% of 240?', ARRAY['30','34','36','40'], 2, 'Aptitude', 'Easy', '240 x 0.15 = 36.'),
('The ratio of two numbers is 3:4 and their sum is productive 28. The larger number is:', ARRAY['12','14','16','18'], 2, 'Aptitude', 'Easy', 'Parts = 28/7 = 4, so larger = 4 x 4 = 16.'),
('A shopkeeper buys an item for 400 and sells it for 460. Profit percentage is:', ARRAY['10%','12%','15%','18%'], 2, 'Aptitude', 'Easy', 'Profit = 60; 60/400 x 100 = 15%.'),
('Find the next number: 2, 6, 12, 20, 30, ?', ARRAY['36','40','42','44'], 2, 'Aptitude', 'Medium', 'Differences are 4,6,8,10,12 so next is 30+12 = 42.'),
('A can finish work in 10 days, B in 15 days. Together they take:', ARRAY['5 days','6 days','7 days','8 days'], 1, 'Aptitude', 'Medium', 'Rate = 1/10 + 1/15 = 1/6, so 6 days.'),
('Simple interest on 5000 at 8% for 3 years is:', ARRAY['1000','1100','1200','1300'], 2, 'Aptitude', 'Easy', 'SI = 5000 x 8 x 3 / 100 = 1200.'),
('The average of 5 numbers is 20. If one number 30 is removed, the new average is:', ARRAY['16','17','17.5','18'], 2, 'Aptitude', 'Medium', 'Sum = 100; remaining = 70 over 4 numbers = 17.5.'),
('In how many ways can the letters of the word "CAT" be arranged?', ARRAY['3','6','9','12'], 1, 'Aptitude', 'Easy', '3! = 6 arrangements.'),
('A clock shows 3:00. What is the angle between the hands?', ARRAY['80 degrees','90 degrees','100 degrees','120 degrees'], 1, 'Aptitude', 'Medium', 'Each hour equals 30 degrees; 3 hours from 12 gives 90 degrees.'),
('Which keyword is used to inherit a class in Java?', ARRAY['implements','extends','inherits','super'], 1, 'Java', 'Easy', '"extends" is used for class inheritance; "implements" is for interfaces.'),
('What is the size of an int in Java?', ARRAY['2 bytes','4 bytes','8 bytes','Platform dependent'], 1, 'Java', 'Easy', 'Java int is always 32 bits (4 bytes).'),
('Which of these is NOT a Java access modifier?', ARRAY['public','private','protected','friend'], 3, 'Java', 'Easy', 'Java has public, private, protected and default. "friend" is C++.'),
('Strings in Java are:', ARRAY['Mutable','Immutable','Both','Neither'], 1, 'Java', 'Easy', 'java.lang.String is immutable; use StringBuilder for mutation.'),
('Which collection does not allow duplicate elements?', ARRAY['ArrayList','LinkedList','HashSet','Vector'], 2, 'Java', 'Easy', 'Set implementations such as HashSet reject duplicates.'),
('What does JVM stand for?', ARRAY['Java Very Machine','Java Virtual Machine','Java Verified Module','Just Virtual Memory'], 1, 'Java', 'Easy', 'JVM = Java Virtual Machine, which executes bytecode.'),
('Which method is the entry point of a Java application?', ARRAY['start()','run()','main()','init()'], 2, 'Java', 'Easy', 'public static void main(String[] args) is the entry point.'),
('Which exception is checked at compile time?', ARRAY['NullPointerException','IOException','ArithmeticException','ArrayIndexOutOfBoundsException'], 1, 'Java', 'Medium', 'IOException is a checked exception; the others are unchecked.'),
('What is the default value of a boolean instance field in Java?', ARRAY['true','false','null','0'], 1, 'Java', 'Easy', 'Uninitialized boolean fields default to false.'),
('Which interface must a class implement to allow its objects to be compared for sorting?', ARRAY['Cloneable','Comparable','Serializable','Runnable'], 1, 'Java', 'Medium', 'Comparable defines compareTo() used for natural ordering.'),
('What does DBMS stand for?', ARRAY['Data Backup Management System','Database Management System','Distributed Batch Memory Store','Data Block Mapping Service'], 1, 'DBMS', 'Easy', 'DBMS = Database Management System.'),
('A primary key is:', ARRAY['Nullable and unique','Unique and not null','Only unique','Only not null'], 1, 'DBMS', 'Easy', 'A primary key must be unique and NOT NULL.'),
('Which normal form removes partial dependencies?', ARRAY['1NF','2NF','3NF','BCNF'], 1, 'DBMS', 'Medium', '2NF removes partial dependency on part of a composite key.'),
('ACID stands for Atomicity, Consistency, Isolation and:', ARRAY['Durability','Distribution','Dependency','Delegation'], 0, 'DBMS', 'Easy', 'The D in ACID is Durability.'),
('A foreign key enforces:', ARRAY['Domain integrity','Referential integrity','Entity integrity','User integrity'], 1, 'DBMS', 'Easy', 'Foreign keys enforce referential integrity between tables.'),
('Which of these is a NoSQL database?', ARRAY['MySQL','PostgreSQL','MongoDB','Oracle'], 2, 'DBMS', 'Easy', 'MongoDB is a document-oriented NoSQL database.'),
('An index primarily improves:', ARRAY['Insert speed','Read/query speed','Storage size','Backup speed'], 1, 'DBMS', 'Medium', 'Indexes speed up lookups but add overhead to writes.'),
('Which isolation level prevents dirty reads but allows phantom reads?', ARRAY['Read Uncommitted','Read Committed','Serializable','None'], 1, 'DBMS', 'Hard', 'Read Committed prevents dirty reads; phantoms remain possible.'),
('A relation in 3NF has no:', ARRAY['Composite keys','Transitive dependencies','Foreign keys','Indexes'], 1, 'DBMS', 'Medium', '3NF eliminates transitive dependencies on non-key attributes.'),
('What is a view in a database?', ARRAY['A physical copy of a table','A stored query presented as a table','A backup file','An index type'], 1, 'DBMS', 'Easy', 'A view is a named stored query that behaves like a virtual table.'),
('Which SQL clause filters rows before grouping?', ARRAY['HAVING','WHERE','ORDER BY','GROUP BY'], 1, 'SQL', 'Easy', 'WHERE filters rows; HAVING filters groups after aggregation.'),
('Which statement removes all rows but keeps the table structure fastest?', ARRAY['DELETE','DROP','TRUNCATE','ALTER'], 2, 'SQL', 'Medium', 'TRUNCATE removes all rows without row-by-row logging.'),
('Which join returns only matching rows from both tables?', ARRAY['LEFT JOIN','RIGHT JOIN','INNER JOIN','FULL JOIN'], 2, 'SQL', 'Easy', 'INNER JOIN keeps only rows matching in both tables.'),
('What does COUNT(*) return?', ARRAY['Number of non-null values in first column','Number of rows','Number of columns','Number of tables'], 1, 'SQL', 'Easy', 'COUNT(*) counts all rows including those with NULLs.'),
('Which keyword removes duplicate rows from a result set?', ARRAY['UNIQUE','DISTINCT','DIFFERENT','SEPARATE'], 1, 'SQL', 'Easy', 'SELECT DISTINCT removes duplicate result rows.'),
('Which operator tests for values in a list?', ARRAY['BETWEEN','LIKE','IN','EXISTS'], 2, 'SQL', 'Easy', 'IN checks membership in a list of values.'),
('Correct syntax to sort results descending by salary:', ARRAY['ORDER salary DESC','ORDER BY salary DESC','SORT BY salary DESC','GROUP BY salary DESC'], 1, 'SQL', 'Easy', 'ORDER BY <column> DESC sorts in descending order.'),
('Which aggregate function ignores NULL values?', ARRAY['COUNT(*)','AVG(col)','ROW_NUMBER()','RANK()'], 1, 'SQL', 'Medium', 'AVG(col) and other column aggregates skip NULLs.'),
('What does a LEFT JOIN return when there is no match on the right?', ARRAY['No row','Row with NULLs for right columns','Error','Duplicate row'], 1, 'SQL', 'Medium', 'Unmatched right-side columns come back as NULL.'),
('Which clause is used with GROUP BY to filter aggregated results?', ARRAY['WHERE','HAVING','FILTER','LIMIT'], 1, 'SQL', 'Medium', 'HAVING applies conditions to aggregated groups.'),
('What is the time complexity of binary search on a sorted array?', ARRAY['O(1)','O(log n)','O(n)','O(n log n)'], 1, 'DSA', 'Easy', 'Binary search halves the search space each step: O(log n).'),
('Which data structure works on LIFO principle?', ARRAY['Queue','Stack','Linked List','Heap'], 1, 'DSA', 'Easy', 'A stack is Last-In-First-Out.'),
('Average time complexity of quicksort is:', ARRAY['O(n)','O(n log n)','O(n^2)','O(log n)'], 1, 'DSA', 'Medium', 'Quicksort averages O(n log n); worst case is O(n^2).'),
('Which traversal of a BST gives sorted order?', ARRAY['Preorder','Inorder','Postorder','Level order'], 1, 'DSA', 'Medium', 'Inorder traversal of a BST visits keys in ascending order.'),
('What is the worst-case lookup time in a hash table?', ARRAY['O(1)','O(log n)','O(n)','O(n^2)'], 2, 'DSA', 'Medium', 'With all keys colliding, lookup degrades to O(n).'),
('Which structure is best for implementing a priority queue?', ARRAY['Array','Heap','Stack','Graph'], 1, 'DSA', 'Medium', 'A binary heap gives O(log n) insert and extract-min.'),
('A queue follows which principle?', ARRAY['FIFO','LIFO','Random','Priority'], 0, 'DSA', 'Easy', 'A queue is First-In-First-Out.'),
('Which algorithm finds shortest paths from a single source with non-negative weights?', ARRAY['Kruskal','Dijkstra','Bellman-Ford only','DFS'], 1, 'DSA', 'Medium', 'Dijkstra handles non-negative edge weights efficiently.'),
('Space complexity of merge sort on arrays is:', ARRAY['O(1)','O(log n)','O(n)','O(n log n)'], 2, 'DSA', 'Hard', 'Merge sort needs an auxiliary array of size n.'),
('Detecting a cycle in a linked list can be done using:', ARRAY['Binary search','Floyd cycle detection','Merge sort','Kadane algorithm'], 1, 'DSA', 'Medium', 'Floyd''s tortoise-and-hare uses slow and fast pointers.');
