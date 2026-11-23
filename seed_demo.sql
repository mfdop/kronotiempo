-- Demo data. Run in the Supabase SQL editor AFTER you have created your login user
-- (it attaches everything to the first user in auth.users).
-- Everything is tagged '[DEMO]' so seed_demo_purge.sql can remove it.
do $$
declare
  uid uuid := (select id from auth.users order by created_at limit 1);
  m_norte uuid; m_rio uuid; m_potros uuid;
  c1 uuid; c2 uuid; c3 uuid;
  trueno uuid; capitan uuid;
  luna uuid; estrella uuid; canela uuid; dulce uuid;
  rayo uuid; brisa uuid; sombra uuid; nube uuid;
  preg1 uuid; preg2 uuid; sale1 uuid; sale2 uuid; psale1 uuid; fee1 uuid;
begin
  if uid is null then raise exception 'Create a user first (Authentication > Users)'; end if;

  -- Parcelas
  insert into meadows (owner_id,name,surface_ha,status,icon_emoji,notes) values (uid,'Dehesa Norte',4.5,'ocupada','🌳','[DEMO]') returning id into m_norte;
  insert into meadows (owner_id,name,surface_ha,status,icon_emoji,notes) values (uid,'Prado del Río',2.0,'ocupada','🌿','[DEMO]') returning id into m_rio;
  insert into meadows (owner_id,name,surface_ha,status,icon_emoji,notes) values (uid,'Cercado Potros',1.2,'descanso','🐎','[DEMO]') returning id into m_potros;

  -- Clientes
  insert into clients (owner_id,name,phone,instagram,city,stable_name,notes) values (uid,'Carlos Méndez','600111222','carlos_mendez','Sevilla','Yeguada Los Olivos','[DEMO]') returning id into c1;
  insert into clients (owner_id,name,phone,instagram,city,stable_name,notes) values (uid,'Lucía Ortega','600333444','lucia.ortega','Córdoba','Cuadras Ortega','[DEMO]') returning id into c2;
  insert into clients (owner_id,name,phone,instagram,city,stable_name,notes) values (uid,'Pedro Navarro','600555666','pnavarro','Madrid',null,'[DEMO]') returning id into c3;

  -- Sementales
  insert into animals (owner_id,name,alias,sex,breed,status,birth_date,registry_number,chip,coat_base,coat_pattern,meadow_id,purchase_price,purchase_date,purchase_origin,private_notes)
    values (uid,'Trueno','Trueno','semental','Appaloosa','activo',current_date-interval '9 years','APP-1001','985112000000001','negro','appaloosa',m_norte,9000,current_date-interval '6 years','Ganadería Sierra','[DEMO]') returning id into trueno;
  insert into animals (owner_id,name,alias,sex,breed,status,birth_date,registry_number,chip,coat_base,coat_pattern,meadow_id,private_notes)
    values (uid,'Capitán','Capi','semental','PRE','activo',current_date-interval '12 years','PRE-2044','985112000000002','castano','lisa',m_norte,'[DEMO]') returning id into capitan;

  -- Yeguas
  insert into animals (owner_id,name,alias,sex,breed,status,birth_date,registry_number,coat_base,coat_pattern,meadow_id,purchase_price,purchase_date,purchase_origin,private_notes)
    values (uid,'Luna','Lunita','yegua','Appaloosa','activo',current_date-interval '8 years','APP-1102','alazan','appaloosa',m_rio,6500,current_date-interval '5 years','Cuadras del Sur','[DEMO]') returning id into luna;
  insert into animals (owner_id,name,sex,breed,status,birth_date,registry_number,coat_base,coat_pattern,meadow_id,private_notes)
    values (uid,'Estrella','yegua','PRE','activo',current_date-interval '10 years','PRE-3120','castano','lisa',m_rio,'[DEMO]') returning id into estrella;
  insert into animals (owner_id,name,sex,breed,status,birth_date,coat_base,coat_pattern,coat_careto,meadow_id,private_notes)
    values (uid,'Canela','yegua','Quarter Horse','activo',current_date-interval '6 years','alazan','lisa',true,m_rio,'[DEMO]') returning id into canela;
  insert into animals (owner_id,name,sex,breed,status,birth_date,coat_base,coat_pattern,meadow_id,custody_owner_name,custody_owner_phone,private_notes)
    values (uid,'Dulce','yegua','Lusitano','custodia',current_date-interval '7 years','castano','lisa',m_rio,'Ana Ruiz','600777888','[DEMO]') returning id into dulce;

  -- Crías y otros
  insert into animals (owner_id,name,sex,breed,status,birth_date,coat_base,coat_pattern,sire_id,dam_id,meadow_id,private_notes)
    values (uid,'Rayo','potro','Appaloosa','activo',current_date-interval '1 year 2 months','negro','appaloosa',trueno,luna,m_potros,'[DEMO]') returning id into rayo;
  insert into animals (owner_id,name,sex,breed,status,birth_date,coat_base,coat_pattern,sire_id,dam_id,meadow_id,private_notes)
    values (uid,'Brisa','potra','Appaloosa','activo',current_date-interval '2 years 3 months','alazan','appaloosa',trueno,luna,m_potros,'[DEMO]') returning id into brisa;
  insert into animals (owner_id,name,sex,breed,status,birth_date,coat_base,coat_pattern,sire_id,dam_id,sold_price,sold_date,sold_client_id,private_notes)
    values (uid,'Sombra','potro','PRE','vendido',current_date-interval '3 years','negro','lisa',capitan,estrella,4800,current_date-interval '4 months',c1,'[DEMO]') returning id into sombra;
  insert into animals (owner_id,name,sex,breed,status,birth_date,coat_base,coat_pattern,meadow_id,private_notes)
    values (uid,'Nube','castrado','Paint Horse','activo',current_date-interval '11 years','castano','pio',m_norte,'[DEMO]') returning id into nube;

  -- Historial de parcelas
  insert into animal_meadow_history (animal_id,meadow_id,entered_at) values
    (trueno,m_norte,now()-interval '90 days'),(capitan,m_norte,now()-interval '200 days'),
    (luna,m_rio,now()-interval '60 days'),(estrella,m_rio,now()-interval '60 days'),
    (canela,m_rio,now()-interval '30 days'),(rayo,m_potros,now()-interval '120 days');

  -- Agua / comida
  insert into meadow_water_logs (meadow_id,logged_at) values (m_norte,now()-interval '1 day'),(m_norte,now()-interval '6 days'),(m_rio,now()-interval '2 days'),(m_potros,now()-interval '4 days');
  insert into meadow_food_logs  (meadow_id,logged_at) values (m_norte,now()-interval '3 days'),(m_rio,now()-interval '5 days'),(m_potros,now()-interval '9 days');

  -- Vientres
  insert into pregnancies (mare_id,sire_id,monta_type,covered_date,confirmed_date,expected_birth_date,result,notes)
    values (luna,trueno,'natural',current_date-200,current_date-170,current_date-200+340,'gestante','[DEMO] Gestación sin incidencias') returning id into preg1;
  insert into pregnancies (mare_id,sire_external_name,monta_type,vet_name,covered_date,confirmed_date,expected_birth_date,result,notes)
    values (estrella,'Fénix de Alcalá','ia','Dr. Romero',current_date-60,current_date-35,current_date-60+340,'gestante','[DEMO]') returning id into preg2;
  insert into pregnancies (mare_id,sire_id,monta_type,covered_date,confirmed_date,expected_birth_date,actual_birth_date,result,foal_id,notes)
    values (luna,trueno,'natural',current_date-interval '1 year 9 months',current_date-interval '1 year 8 months',(current_date-interval '1 year 9 months')::date+340,current_date-interval '1 year 2 months','cria_viva',rayo,'[DEMO]');

  insert into pregnancy_sales (pregnancy_id,client_id,agreed_price,notes)
    values (preg2,c3,7000,'[DEMO]') returning id into psale1;
  insert into payments (owner_id,pregnancy_sale_id,amount,paid_date,method,notes) values
    (uid,psale1,1500,current_date-50,'transferencia','[DEMO] Reserva'),
    (uid,psale1,1000,current_date-20,'bizum','[DEMO] Segundo pago');

  -- Cubriciones
  insert into semen_sales (stallion_id,client_id,mare_name,agreed_price,year,notes)
    values (trueno,c1,'Gitana',600,extract(year from current_date)::int,'[DEMO]') returning id into sale1;
  insert into payments (owner_id,semen_sale_id,amount,paid_date,method,notes) values
    (uid,sale1,200,current_date-45,'bizum','[DEMO] Reserva'),
    (uid,sale1,400,current_date-39,'efectivo','[DEMO] Pago final');
  insert into semen_shippings (semen_sale_id,attempt_number,estimated_date,actual_date,result)
    values (sale1,1,current_date-40,current_date-39,'prenez');
  insert into semen_sales (stallion_id,client_id,mare_name,agreed_price,year,notes)
    values (capitan,c2,'Esperanza',500,extract(year from current_date)::int,'[DEMO]') returning id into sale2;
  insert into payments (owner_id,semen_sale_id,amount,paid_date,method,notes)
    values (uid,sale2,100,current_date-10,'transferencia','[DEMO] Reserva');

  -- Herrado
  insert into shoeing_records (animal_id,date,type,farrier_name,cost,next_estimated_date,notes) values
    (trueno,current_date-70,'completo','Manuel',70,current_date-70+90,'[DEMO]'),
    (capitan,current_date-20,'completo','Manuel',70,current_date-20+90,'[DEMO]'),
    (luna,current_date-45,'recorte','Manuel',35,current_date-45+90,'[DEMO]'),
    (nube,current_date-90,'completo','Manuel',90,current_date-90+90,'[DEMO]');

  -- Salud
  insert into health_episodes (animal_id,title,start_date,end_date,status,vet_name,treatment,notes) values
    (estrella,'Cojera mano izquierda',current_date-12,null,'activo','Dr. Romero','Antiinflamatorio 5 días','[DEMO]'),
    (nube,'Cólico leve',current_date-200,current_date-198,'resuelto','Dr. Romero','Fluidoterapia','[DEMO]'),
    (capitan,'Artrosis jarrete',current_date-400,null,'cronico','Dr. Romero','Condroprotector','[DEMO]');
  insert into vaccines (animal_id,type,date_applied,next_date,vet_name,notes) values
    (trueno,'Gripe equina',current_date-300,current_date-300+365,'Dr. Romero','[DEMO]'),
    (luna,'Tétanos',current_date-400,current_date-35,'Dr. Romero','[DEMO] Vencida'),
    (capitan,'Gripe equina',current_date-100,current_date-100+365,'Dr. Romero','[DEMO]');

  -- Custodia: mensualidad
  insert into maintenance_fees (animal_id,monthly_amount,effective_from,notes)
    values (dulce,180,current_date-120,'[DEMO]') returning id into fee1;
  insert into maintenance_entries (animal_id,fee_id,month,amount,payment_status,paid_date) values
    (dulce,fee1,(date_trunc('month',current_date)-interval '2 months')::date,180,'pagado',current_date-55),
    (dulce,fee1,(date_trunc('month',current_date)-interval '1 month')::date,180,'pagado',current_date-25);

  -- Genética
  -- Valores válidos según LOCI_* en src/lib/constants.ts. Genotipos coherentes con la genealogía.
  insert into animal_genetics (animal_id,grey,extension,agouti,cream,pearl,appaloosa,dun,silver,roan,tobiano,overo,sabino,lab_date,lab_institution,notes) values
    (trueno,  'gg','Ee','aa','N/N','N/N','N/LP','N/N','N/N','N/N','N/N','N/N','N/N',current_date-1500,'Laboklin','[DEMO]'),
    (capitan, 'gg','Ee','Aa','N/N','N/N','N/N', 'N/N','N/N','N/N','N/N','N/N','N/N',current_date-1200,'VGL UC Davis','[DEMO]'),
    (luna,    'gg','ee','Aa','N/N','N/N','N/LP','N/N','N/N','N/N','N/N','N/N','N/N',current_date-1400,'Laboklin','[DEMO]'),
    (estrella,'gg','Ee','Aa','N/Cr','N/N','N/N','N/N','N/N','N/N','N/N','N/N','N/N',current_date-900,'Laboklin','[DEMO]'),
    (canela,  'gg','ee','AA','N/N','N/N','N/N', 'N/N','N/N','N/N','N/N','N/N','N/N',current_date-800,'VGL UC Davis','[DEMO]'),
    (rayo,    'gg','Ee','aa','N/N','N/N','N/LP','N/N','N/N','N/N','N/N','N/N','N/N',current_date-300,'Laboklin','[DEMO] Hijo de Trueno x Luna'),
    (brisa,   'gg','ee','Aa','N/N','N/N','N/LP','N/N','N/N','N/N','N/N','N/N','N/N',current_date-600,'Laboklin','[DEMO] Hija de Trueno x Luna'),
    (nube,    'gg','Ee','Aa','N/N','N/N','N/N', 'N/N','N/N','N/N','N/TO','N/N','N/N',current_date-700,'VGL UC Davis','[DEMO]');
end $$;
