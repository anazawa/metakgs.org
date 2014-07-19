package MetaKGS::Teng::Cursor;
use strict;
use warnings;
use Carp qw/croak/;

sub new {
    my $class = shift;
    my %args = @_ == 1 ? %{$_[0]} : @_;
    bless \%args, $class;
}

sub teng {
    $_[0]->{teng};
}

sub query {
    $_[0]->{query};
}

sub _inflators {
    $_[0]->{_inflators} ||= {};
}

sub add_inflator {
    my ( $self, @args ) = @_;
    my $inflators = $self->_inflators;

    croak "Odd number of arguments passed 'add_inflator'" if @args % 2;

    while ( my ($key, $value) = splice @args, 0, 2 ) {
        my @values = ref $value eq 'ARRAY' ? @$value : $value;
        push @{ $inflators->{$key} ||= [] }, @values;
    }

    return;
}

sub _run_inflator {
    my ( $self, $row ) = @_;
    my $inflators = $self->_inflators;

    for my $key ( keys %$inflators ) {
        next unless exists $row->{$key};
        for my $inflator ( @{$inflators->{$key}} ) {
            $row->{$key} = $inflator->( $row->{$key} );
        }
    }
    
    return;
}

sub sth {
    my $self = shift;

    if ( @_ ) {
        $self->{sth} = shift;
    }
    elsif ( !exists $self->{sth} ) {
        $self->{sth} = $self->teng->execute( @{$self->query} );
    }
    else {
        $self->{sth};
    }
}

sub next {
    my $self = shift;
    my $sth = $self->sth;
    my $row = $sth && $sth->fetchrow_hashref;

    if ( $sth and !$row ) {
        $self->sth( undef );
        $sth->finish;
    }

    return if !$sth or !$row;

    $self->_run_inflator( $row );

    $row;
}

sub all {
    my $self = shift;
    my $sth = $self->sth;
    my $rows = $sth ? $sth->fetchall_arrayref({}) : [];

    if ( $sth ) {
        $self->sth( undef );
        $sth->finish;
    }

    for my $row ( @$rows ) {
        $self->_run_inflator( $row );
    }

    $rows;
}

1;
