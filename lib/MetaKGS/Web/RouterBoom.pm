package MetaKGS::Web::RouterBoom;
use strict;
use warnings;
use MetaKGS::Web::RouterBoom::Declare;

get '/' => 'Root#index';

get '/explorer' => 'Explorer#show';

get '/api/archives/:user' => 'API::GameArchives#show';
get '/api/archives/:user/:year/:month' => 'API::GameArchives#show';

get '/api/tournaments' => 'API::TournList#show';
get '/api/tournaments/:year' => 'API::TournList#show';

get '/api/tournament/:id' => 'API::TournInfo#show';
get '/api/tournament/:id/entrants' => 'API::TournEntrants#show';
get '/api/tournament/:id/round/:round' => 'API::TournGames#show';

1;
