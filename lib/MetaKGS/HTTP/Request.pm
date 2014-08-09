package MetaKGS::HTTP::Request;
use strict;
use warnings;
use parent qw/HTTP::Request/;
use Data::UUID;

sub id {
    $_[0]->{_id} ||= Data::UUID->new->create_str;
}

1;
