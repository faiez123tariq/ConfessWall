-- Bump confessions.upvotes when a row is inserted into upvotes (Phase 4 TASK-015)
CREATE OR REPLACE FUNCTION public.bump_confession_upvote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE confessions
  SET upvotes = upvotes + 1
  WHERE id = NEW.confession_id AND deleted = false;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_upvotes_bump_count ON upvotes;

CREATE TRIGGER trg_upvotes_bump_count
  AFTER INSERT ON upvotes
  FOR EACH ROW
  EXECUTE PROCEDURE public.bump_confession_upvote_count();
