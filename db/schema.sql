-- AI Daily 스키마
--
-- 테이블이 둘인 이유: 화면에 뜨는 것(article)과 "이미 평가해봤다"는 기록(seen_url)은
-- 수명이 다르다. 탈락한 항목도 URL은 기억해야 내일 같은 기사를 다시 모델에 태우지 않는다.
--
-- 원문 본문은 저장하지 않는다. 요약과 링크만 있으면 되고, 저장하는 순간 스토리지와
-- 저작권 문제가 같이 따라온다.

create table if not exists article (
  -- url_key의 sha256 앞 16자. 짧아서 삭제 API 경로에 그대로 쓴다.
  id           text        primary key,
  title        text        not null,
  -- 화면에 보여줄 원본 URL. 추적 파라미터가 붙어 있어도 그대로 둔다.
  url          text        not null,
  -- 정규화된 URL. 중복 판정 기준.
  url_key      text        not null unique,
  source       text        not null,
  source_label text        not null,
  published_at timestamptz,
  -- 아래 넷은 Claude가 채운다
  summary      text,
  insight      text,
  importance   text        not null default 'MEDIUM'
                           check (importance in ('HIGH', 'MEDIUM', 'LOW')),
  score        integer     not null default 0,
  tags         text[]      not null default '{}',
  -- 어느 날짜 리포트에 속하는지. 발행일과 다르다.
  digest_date  date        not null,
  created_at   timestamptz not null default now()
);

-- 화면은 항상 "최근 날짜부터, 그 안에서는 점수순"으로 읽는다
create index if not exists article_digest_idx
  on article (digest_date desc, score desc);

-- 보존 기간 정리용
create index if not exists article_created_idx
  on article (created_at);

create table if not exists seen_url (
  url_key    text        primary key,
  source     text        not null,
  first_seen timestamptz not null default now()
);

create index if not exists seen_url_first_seen_idx
  on seen_url (first_seen);
