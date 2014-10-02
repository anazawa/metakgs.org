package MetaKGS::CLI;
use strict;
use warnings;
use parent qw/MetaKGS/;
use Data::ObjectDriver::Driver::DBI;
use TheSchwartz;

sub the_schwartz {
    my $self = shift;
    $self->{the_schwartz} ||= $self->_build_the_schwartz;
}

sub _build_the_schwartz {
    my $self = shift;
    my $config = $self->config->{'TheSchwartz'};
    my $dbh = DBI->connect( @$config );
    my $driver = Data::ObjectDriver::Driver::DBI->new( dbh => $dbh );

    TheSchwartz->new(
        databases => [{ driver => $driver }],
    );
}

1;
