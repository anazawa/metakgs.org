package MetaKGS::HTTP::Request;
use strict;
use warnings;
use parent qw/HTTP::Request/;

sub id {
    my $self = shift;
    $self->{_id} = shift if @_;
    $self->{_id};
}

1;
