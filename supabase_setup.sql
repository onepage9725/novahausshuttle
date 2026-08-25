-- Run this entire script in Supabase SQL Editor.

create table if not exists trips_v2 (
	id bigint generated always as identity primary key,
	date date not null,
	location text not null check (location in ('AERA', 'HELIX')),
	bus text not null check (bus in ('A', 'B')),
	time text not null,
	capacity integer not null,
	booked integer not null default 0,
	created_at timestamptz not null default now(),
	unique (date, location, bus, time),
	check (booked >= 0),
	check (capacity > 0),
	check (booked <= capacity)
);

create table if not exists bookings_v2 (
	id bigint generated always as identity primary key,
	trip_id bigint not null references trips_v2(id) on delete cascade,
	student_name text,
	created_at timestamptz not null default now()
);

create table if not exists app_meta (
	key text primary key,
	value text not null
);

create table if not exists students (
	id bigint generated always as identity primary key,
	full_name text not null unique,
	contact_number text,
	remark text,
	created_at timestamptz not null default now()
);

alter table students add column if not exists contact_number text;
alter table students add column if not exists remark text;

drop function if exists book_trip_atomic_v2(bigint, text);

create function book_trip_atomic_v2(p_trip_id bigint, p_student_name text default null)
returns table (
	success boolean,
	id bigint,
	trip_date date,
	location text,
	bus text,
	trip_time text,
	capacity integer,
	booked integer
)
language plpgsql
as $$
declare
	t trips_v2%rowtype;
	p trips_v2%rowtype;
	next_booked integer;
	pair_location text;
	pair_time text;
	idx integer;
	aera_a_out text[] := array['07:15','08:30','09:30','10:30','11:30','13:30','15:30','17:30'];
	helix_a_out text[] := array['07:20','08:35','09:35','10:35','11:35','13:35','15:35','17:35'];
	aera_b_out text[] := array['07:20','08:00','09:00','10:00','11:00','13:00','15:00','17:00'];
	helix_b_out text[] := array['07:25','08:05','09:05','10:05','11:05','13:05','15:05','17:05'];
	aera_a_in text[] := array['10:00','12:00','14:00','16:00','18:00'];
	helix_a_in text[] := array['10:00','12:00','14:00','16:00','18:00'];
	aera_b_in text[] := array['09:30','11:30','13:30','15:30','17:30'];
	helix_b_in text[] := array['09:30','11:30','13:30','15:30','17:30'];
begin
	select * into t
	from trips_v2
	where trips_v2.id = p_trip_id
	for update;

	if not found then
		return query select false, null::bigint, null::date, null::text, null::text, null::text, null::integer, null::integer;
		return;
	end if;

	pair_location := null;
	pair_time := null;

	if t.location in ('AERA', 'HELIX') then
		if t.bus = 'A' then
			idx := array_position(aera_a_out, t.time);
			if idx is not null and t.location = 'AERA' then
				pair_location := 'HELIX';
				pair_time := helix_a_out[idx];
			elsif idx is not null and t.location = 'HELIX' then
				pair_location := 'AERA';
				pair_time := aera_a_out[idx];
			else
				idx := array_position(aera_a_in, t.time);
				if idx is not null and t.location = 'AERA' then
					pair_location := 'HELIX';
					pair_time := helix_a_in[idx];
				elsif idx is not null and t.location = 'HELIX' then
					pair_location := 'AERA';
					pair_time := aera_a_in[idx];
				end if;
			end if;
		elsif t.bus = 'B' then
			idx := array_position(aera_b_out, t.time);
			if idx is not null and t.location = 'AERA' then
				pair_location := 'HELIX';
				pair_time := helix_b_out[idx];
			elsif idx is not null and t.location = 'HELIX' then
				pair_location := 'AERA';
				pair_time := aera_b_out[idx];
			else
				idx := array_position(aera_b_in, t.time);
				if idx is not null and t.location = 'AERA' then
					pair_location := 'HELIX';
					pair_time := helix_b_in[idx];
				elsif idx is not null and t.location = 'HELIX' then
					pair_location := 'AERA';
					pair_time := aera_b_in[idx];
				end if;
			end if;
		end if;
	end if;

	if pair_location is not null then
		select * into p
		from trips_v2
		where trips_v2.date = t.date
			and trips_v2.location = pair_location
			and trips_v2.bus = t.bus
			and trips_v2.time = pair_time
		for update;

		if found then
			next_booked := greatest(t.booked, p.booked) + 1;
			if next_booked > t.capacity then
				return query select false, t.id, t.date, t.location, t.bus, t.time, t.capacity, t.booked;
				return;
			end if;

			update trips_v2 set booked = next_booked where trips_v2.id = t.id;
			update trips_v2 set booked = next_booked where trips_v2.id = p.id;

			insert into bookings_v2 (trip_id, student_name)
			values (t.id, p_student_name);

			select * into t from trips_v2 where trips_v2.id = t.id;
			return query select true, t.id, t.date, t.location, t.bus, t.time, t.capacity, t.booked;
			return;
		end if;
	end if;

	if t.booked >= t.capacity then
		return query select false, t.id, t.date, t.location, t.bus, t.time, t.capacity, t.booked;
		return;
	end if;

	update trips_v2
		set booked = trips_v2.booked + 1
	where trips_v2.id = t.id
	returning * into t;

	insert into bookings_v2 (trip_id, student_name)
	values (t.id, p_student_name);

	return query select true, t.id, t.date, t.location, t.bus, t.time, t.capacity, t.booked;
end;
$$;
